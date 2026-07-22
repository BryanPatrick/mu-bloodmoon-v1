import { Controller, Get, NotFoundException, Param, StreamableFile } from '@nestjs/common'
import { createReadStream, existsSync } from 'node:fs'
import { basename, join } from 'node:path'

@Controller('media')
export class MediaController {
  @Get(':fileName')
  file(@Param('fileName') requestedName: string) {
    const fileName = basename(requestedName)
    if (fileName !== requestedName || !/^[a-f0-9-]+\.(?:png|jpg|webp)$/i.test(fileName)) {
      throw new NotFoundException('Imagem nao encontrada.')
    }
    const path = join(process.cwd(), 'storage', 'uploads', fileName)
    if (!existsSync(path)) throw new NotFoundException('Imagem nao encontrada.')
    const type = fileName.endsWith('.png') ? 'image/png' : fileName.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
    return new StreamableFile(createReadStream(path), { type })
  }
}
