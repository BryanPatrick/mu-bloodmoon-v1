import { Controller, Get, NotFoundException, Param, StreamableFile } from '@nestjs/common'
import { createReadStream, existsSync } from 'node:fs'
import { basename, join } from 'node:path'

// Mirrors admin-content/media.controller.ts's exact security pattern:
// basename() to strip any path segment, then a strict extension allowlist,
// so a requested filename can never escape storage/launcher-assets.
@Controller('media/launcher-assets')
export class LauncherAssetMediaController {
  @Get(':fileName')
  file(@Param('fileName') requestedName: string) {
    const fileName = basename(requestedName)
    if (fileName !== requestedName || !/^[a-f0-9-]+\.(?:png|jpg|webp)$/i.test(fileName)) {
      throw new NotFoundException('Asset not found.')
    }
    const path = join(process.cwd(), 'storage', 'launcher-assets', fileName)
    if (!existsSync(path)) throw new NotFoundException('Asset not found.')
    const type = fileName.endsWith('.png') ? 'image/png' : fileName.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
    return new StreamableFile(createReadStream(path), { type })
  }
}
