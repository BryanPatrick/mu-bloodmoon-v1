import { BadRequestException, Injectable } from '@nestjs/common'
import type { CommunityPostType, Prisma } from '@prisma/client'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import sharp from 'sharp'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'

const MAX_DIMENSION = 8000
const MAX_PIXELS = 40_000_000
const FORMAT_TO_EXTENSION = { jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif' } as const
const MIME_BY_EXTENSION = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' } as const

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService, private readonly observability: ObservabilityService) {}

  private directory() {
    return resolve(process.env.COMMUNITY_MEDIA_DIR || join(process.cwd(), 'storage', 'community-media'))
  }

  private publicUrl(filename: string) {
    const prefix = (process.env.API_GLOBAL_PREFIX ?? 'api').replace(/^\/+|\/+$/g, '')
    return `${prefix ? `/${prefix}` : ''}/media/community/${filename}`
  }

  async upload(file: Express.Multer.File, user: AuthenticatedUser) {
    try {
      const inputExtension = extname(file.originalname).slice(1).toLowerCase().replace('jpeg', 'jpg')
      if (!['jpg', 'png', 'webp', 'gif'].includes(inputExtension)) {
        throw new BadRequestException('Formato nao permitido. Use JPG, PNG, WebP ou GIF.')
      }
      const source = sharp(file.buffer, { animated: true, limitInputPixels: MAX_PIXELS })
      const metadata = await source.metadata()
      const format = metadata.format as keyof typeof FORMAT_TO_EXTENSION
      const detectedExtension = FORMAT_TO_EXTENSION[format]
      const width = metadata.width || 0
      const height = metadata.height || 0
      if (!detectedExtension || width < 1 || height < 1 || width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
        throw new BadRequestException('A imagem possui formato ou dimensoes invalidas.')
      }
      if (inputExtension !== detectedExtension || file.mimetype !== MIME_BY_EXTENSION[detectedExtension]) {
        throw new BadRequestException('O conteudo real do arquivo nao corresponde a extensao informada.')
      }

      const isGif = detectedExtension === 'gif'
      const processed = isGif
        ? await sharp(file.buffer, { animated: true, limitInputPixels: MAX_PIXELS }).gif({ effort: 5 }).toBuffer()
        : await sharp(file.buffer, { limitInputPixels: MAX_PIXELS }).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer()
      const outputExtension = isGif ? 'gif' : 'webp'
      const outputMime = MIME_BY_EXTENSION[outputExtension]
      const outputMetadata = await sharp(processed, { animated: isGif }).metadata()
      const filename = `${randomUUID()}.${outputExtension}`
      const storagePath = join(this.directory(), filename)
      await mkdir(this.directory(), { recursive: true })
      await writeFile(storagePath, processed)
      return this.prisma.communityMedia.create({
        data: {
          ownerId: user.id,
          kind: isGif ? 'GIF' : 'IMAGE',
          status: 'READY',
          url: this.publicUrl(filename),
          storagePath,
          originalName: file.originalname.slice(0, 255),
          mimeType: outputMime,
          extension: outputExtension,
          sizeBytes: processed.byteLength,
          width: outputMetadata.width || width,
          height: outputMetadata.height || height,
          sha256: createHash('sha256').update(processed).digest('hex')
        },
        select: { id: true, kind: true, url: true, mimeType: true, sizeBytes: true, width: true, height: true }
      })
    } catch (error) {
      await this.observability.recordSystemError({
        module: 'community.media', severity: error instanceof BadRequestException ? 'WARNING' : 'ERROR',
        errorCode: 'COMMUNITY_MEDIA_PROCESSING_FAILED', publicMessage: 'Nao foi possivel processar a midia.',
        internalMessage: error instanceof Error ? error.message : String(error), stackTrace: error instanceof Error ? error.stack : undefined,
        userId: user.id
      })
      if (error instanceof BadRequestException) throw error
      throw new BadRequestException('Nao foi possivel processar esta imagem.')
    }
  }

  async resolveForPost(mediaIds: string[] | undefined, ownerId: string, type: CommunityPostType) {
    const ids = [...new Set((mediaIds || []).map(String).filter(Boolean))]
    const limits: Partial<Record<CommunityPostType, [number, number]>> = { TEXT: [0, 0], ARTICLE: [0, 1], IMAGE: [1, 1], GALLERY: [2, 6], GIF: [1, 1] }
    const [minimum, maximum] = limits[type] || [0, 0]
    if (ids.length < minimum || ids.length > maximum) throw new BadRequestException(`Quantidade de midias invalida para ${type}.`)
    if (!ids.length) return []
    const assets = await this.prisma.communityMedia.findMany({ where: { id: { in: ids }, ownerId, status: { in: ['READY', 'ATTACHED'] } } })
    if (assets.length !== ids.length) throw new BadRequestException('Uma ou mais midias nao pertencem a sua conta ou nao estao disponiveis.')
    if (type === 'GIF' && assets.some((asset) => asset.kind !== 'GIF')) throw new BadRequestException('A publicacao GIF exige um arquivo GIF valido.')
    if (type !== 'GIF' && assets.some((asset) => asset.kind === 'GIF')) throw new BadRequestException('Use o tipo GIF para publicar este arquivo.')
    return ids.map((id) => assets.find((asset) => asset.id === id)!)
  }

  snapshot(assets: Awaited<ReturnType<MediaService['resolveForPost']>>): Prisma.InputJsonValue {
    return assets.map(({ id, kind, url, mimeType, width, height }) => ({ id, kind, url, mimeType, width, height }))
  }
}
