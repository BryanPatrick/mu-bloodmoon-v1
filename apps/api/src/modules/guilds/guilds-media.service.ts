import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common'
import type { GuildMediaKind } from '@prisma/client'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import sharp from 'sharp'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'

const MAX_DIMENSION = 4000
const MAX_PIXELS = 20_000_000
// Narrower than community media (no GIF) -- emblems/banners are static
// branding assets, not feed content.
const FORMAT_TO_EXTENSION = { jpeg: 'jpg', png: 'png', webp: 'webp' } as const
const MIME_BY_EXTENSION = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const

const TARGETS: Record<GuildMediaKind, { width: number, height: number }> = {
  EMBLEM: { width: 512, height: 512 },
  BANNER: { width: 1600, height: 480 }
}

@Injectable()
export class GuildsMediaService {
  constructor(private readonly prisma: PrismaService, private readonly observability: ObservabilityService) {}

  private directory() {
    return resolve(process.env.GUILD_MEDIA_DIR || join(process.cwd(), 'storage', 'guild-media'))
  }

  private publicUrl(filename: string) {
    const prefix = (process.env.API_GLOBAL_PREFIX ?? 'api').replace(/^\/+|\/+$/g, '')
    return `${prefix ? `/${prefix}` : ''}/media/guild/${filename}`
  }

  private async process(guildId: string, kind: GuildMediaKind, file: Express.Multer.File, user: AuthenticatedUser) {
    try {
      const inputExtension = extname(file.originalname).slice(1).toLowerCase().replace('jpeg', 'jpg')
      if (!['jpg', 'png', 'webp'].includes(inputExtension)) {
        throw new BadRequestException('Formato não permitido. Use JPG, PNG ou WebP.')
      }
      const metadata = await sharp(file.buffer, { limitInputPixels: MAX_PIXELS })
        .metadata()
        .catch(() => {
          throw new BadRequestException('O arquivo está corrompido ou não é uma imagem válida.')
        })
      const format = metadata.format as keyof typeof FORMAT_TO_EXTENSION
      const detectedExtension = FORMAT_TO_EXTENSION[format]
      const width = metadata.width || 0
      const height = metadata.height || 0
      if (!detectedExtension || width < 1 || height < 1 || width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
        throw new BadRequestException('A imagem possui formato ou dimensões inválidas.')
      }
      if (inputExtension !== detectedExtension || file.mimetype !== MIME_BY_EXTENSION[detectedExtension]) {
        throw new BadRequestException('O conteúdo real do arquivo não corresponde à extensão informada.')
      }
      const target = TARGETS[kind]
      const processed = await sharp(file.buffer, { limitInputPixels: MAX_PIXELS })
        .rotate()
        .resize({ width: target.width, height: target.height, fit: 'cover', position: 'centre' })
        .webp({ quality: 88 })
        .toBuffer()
        .catch(() => {
          throw new BadRequestException('Não foi possível processar o conteúdo desta imagem.')
        })
      const outputMetadata = await sharp(processed).metadata()
      const filename = `${randomUUID()}.webp`
      const storagePath = join(this.directory(), filename)
      await mkdir(this.directory(), { recursive: true })
      await writeFile(storagePath, processed)
      const sha256 = createHash('sha256').update(processed).digest('hex')
      const media = await this.prisma.$transaction(async (tx) => {
        const created = await tx.guildMedia.create({
          data: {
            guildId,
            uploadedByAccountId: user.id,
            kind,
            status: 'READY',
            url: this.publicUrl(filename),
            storagePath,
            originalName: file.originalname.slice(0, 255),
            mimeType: 'image/webp',
            extension: 'webp',
            sizeBytes: processed.byteLength,
            width: outputMetadata.width || target.width,
            height: outputMetadata.height || target.height,
            sha256
          }
        })
        await tx.guild.update({
          where: { id: guildId },
          data: kind === 'EMBLEM' ? { emblemUrl: created.url } : { bannerUrl: created.url }
        })
        return created
      })
      await this.observability.recordOperationalEvent({
        module: 'guilds', eventType: `GUILD_MEDIA_${kind}_UPLOADED`, entityType: 'GuildMedia', entityId: media.id,
        actorUserId: user.id, description: `${kind === 'EMBLEM' ? 'Emblema' : 'Banner'} da guild atualizado (${media.sizeBytes} bytes).`,
        data: { sha256, guildId }
      })
      return media
    } catch (error) {
      await this.observability.recordSystemError({
        module: 'guilds.media', severity: error instanceof BadRequestException ? 'WARNING' : 'ERROR',
        errorCode: 'GUILD_MEDIA_PROCESSING_FAILED', publicMessage: 'Não foi possível processar a mídia.',
        internalMessage: error instanceof Error ? error.message : String(error), stackTrace: error instanceof Error ? error.stack : undefined,
        userId: user.id
      })
      if (error instanceof BadRequestException) throw error
      throw new InternalServerErrorException('Não foi possível salvar a mídia no momento.')
    }
  }

  uploadEmblem(guildId: string, file: Express.Multer.File, user: AuthenticatedUser) {
    return this.process(guildId, 'EMBLEM', file, user)
  }

  uploadBanner(guildId: string, file: Express.Multer.File, user: AuthenticatedUser) {
    return this.process(guildId, 'BANNER', file, user)
  }
}
