import { extname } from 'node:path'
import sharp from 'sharp'

export const MAX_DIMENSION = 8000
export const MAX_PIXELS = 40_000_000
export const FORMAT_TO_EXTENSION = { jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif' } as const
export const MIME_BY_EXTENSION = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' } as const

export type ImageExtension = keyof typeof MIME_BY_EXTENSION

export type ImageValidationResult =
  | {
      ok: true
      extension: ImageExtension
      mimeType: string
      width: number
      height: number
      processed: Buffer
    }
  | { ok: false; reason: string }

// Pure and side-effect-free by design (no fs, no DB, no logging) so it can
// be unit-tested against crafted buffers directly, and so MediaService can
// write a REJECTED audit row with the exact `reason` string instead of just
// a generic 400 -- the one thing the previous inline version couldn't do,
// since it threw straight past any place that could have recorded why.
export async function validateAndProcessImage(
  buffer: Buffer,
  originalName: string,
  declaredMimeType: string
): Promise<ImageValidationResult> {
  const inputExtension = extname(originalName).slice(1).toLowerCase().replace('jpeg', 'jpg')
  if (!['jpg', 'png', 'webp', 'gif'].includes(inputExtension)) {
    return { ok: false, reason: 'Formato nao permitido. Use JPG, PNG, WebP ou GIF.' }
  }

  const metadata = await sharp(buffer, { animated: true, limitInputPixels: MAX_PIXELS })
    .metadata()
    .catch(() => null)
  if (!metadata) return { ok: false, reason: 'O arquivo esta corrompido ou nao e uma imagem valida.' }

  const format = metadata.format as keyof typeof FORMAT_TO_EXTENSION
  const detectedExtension = FORMAT_TO_EXTENSION[format]
  const width = metadata.width || 0
  const height = metadata.height || 0
  if (
    !detectedExtension ||
    width < 1 ||
    height < 1 ||
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION ||
    width * height > MAX_PIXELS
  ) {
    return { ok: false, reason: 'A imagem possui formato ou dimensoes invalidas.' }
  }
  if (inputExtension !== detectedExtension || declaredMimeType !== MIME_BY_EXTENSION[detectedExtension]) {
    return { ok: false, reason: 'O conteudo real do arquivo nao corresponde a extensao informada.' }
  }

  const isGif = detectedExtension === 'gif'
  const processed = await (isGif
    ? sharp(buffer, { animated: true, limitInputPixels: MAX_PIXELS }).gif({ effort: 5 }).toBuffer()
    : sharp(buffer, { limitInputPixels: MAX_PIXELS })
        .rotate()
        .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 86 })
        .toBuffer()
  ).catch(() => null)
  if (!processed) return { ok: false, reason: 'Nao foi possivel processar o conteudo desta imagem.' }

  const outputExtension: ImageExtension = isGif ? 'gif' : 'webp'
  const outputMetadata = await sharp(processed, { animated: isGif }).metadata()
  return {
    ok: true,
    extension: outputExtension,
    mimeType: MIME_BY_EXTENSION[outputExtension],
    width: outputMetadata.width || width,
    height: outputMetadata.height || height,
    processed
  }
}
