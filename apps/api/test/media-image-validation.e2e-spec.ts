// Pure-logic tests for validateAndProcessImage -- no DB, no HTTP, no disk.
// Named *.e2e-spec.ts (not *.spec.ts) to match this repo's single Jest
// config (test/jest-e2e.json only matches that suffix); nothing here is
// actually end-to-end, it just runs under the same runner.
import sharp from 'sharp'
import { validateAndProcessImage } from '../src/modules/media/validation/image-validation'

jest.setTimeout(30000)

async function pngBuffer(width = 32, height = 24) {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 20, b: 20 } } }).png().toBuffer()
}
async function jpegBuffer(width = 32, height = 24) {
  return sharp({ create: { width, height, channels: 3, background: { r: 20, g: 200, b: 20 } } }).jpeg().toBuffer()
}
async function webpBuffer(width = 32, height = 24) {
  return sharp({ create: { width, height, channels: 3, background: { r: 20, g: 20, b: 200 } } }).webp().toBuffer()
}
async function gifBuffer(width = 16, height = 16) {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 200, b: 20 } } }).gif().toBuffer()
}

describe('validateAndProcessImage', () => {
  it('accepts a real PNG and re-encodes to WebP', async () => {
    const result = await validateAndProcessImage(await pngBuffer(), 'photo.png', 'image/png')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.extension).toBe('webp')
      expect(result.mimeType).toBe('image/webp')
      expect(result.width).toBe(32)
      expect(result.height).toBe(24)
    }
  })

  it('accepts a real JPEG', async () => {
    const result = await validateAndProcessImage(await jpegBuffer(), 'photo.jpg', 'image/jpeg')
    expect(result.ok).toBe(true)
  })

  it('accepts a real WebP', async () => {
    const result = await validateAndProcessImage(await webpBuffer(), 'photo.webp', 'image/webp')
    expect(result.ok).toBe(true)
  })

  it('accepts a real GIF and keeps it as GIF (not re-encoded to WebP)', async () => {
    const result = await validateAndProcessImage(await gifBuffer(), 'photo.gif', 'image/gif')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.extension).toBe('gif')
  })

  it('rejects an unsupported extension outright, before decoding anything', async () => {
    const result = await validateAndProcessImage(Buffer.from('irrelevant'), 'file.bmp', 'image/bmp')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/Formato nao permitido/)
  })

  it('rejects a file with no extension', async () => {
    const result = await validateAndProcessImage(await pngBuffer(), 'noextension', 'image/png')
    expect(result.ok).toBe(false)
  })

  it('rejects corrupted/garbage bytes claiming to be a PNG (bad magic bytes)', async () => {
    const garbage = Buffer.from('not actually an image no matter what the name says'.repeat(20))
    const result = await validateAndProcessImage(garbage, 'fake.png', 'image/png')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/corrompido/)
  })

  it('rejects a fake extension: real PNG bytes named .jpg', async () => {
    const result = await validateAndProcessImage(await pngBuffer(), 'photo.jpg', 'image/jpeg')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/nao corresponde/)
  })

  it('rejects a fake declared MIME type: real PNG bytes, correct extension, wrong declared mimetype', async () => {
    const result = await validateAndProcessImage(await pngBuffer(), 'photo.png', 'image/jpeg')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/nao corresponde/)
  })

  it('rejects an image exceeding the total pixel budget (both axes individually under the per-axis cap) -- caught by sharp\'s own limitInputPixels guard before metadata is even read', async () => {
    // 7000 x 6000 = 42,000,000 px > MAX_PIXELS (40,000,000), both axes < MAX_DIMENSION (8000).
    // sharp(buffer, { limitInputPixels: MAX_PIXELS }) refuses to decode this
    // at all, so it surfaces as the generic "corrupted" reason rather than
    // reaching the explicit width*height > MAX_PIXELS check further down --
    // that check only remains reachable for a format whose header reports
    // dimensions without sharp needing to decode pixel data to know them.
    const oversized = await sharp({ create: { width: 7000, height: 6000, channels: 3, background: { r: 1, g: 1, b: 1 } } })
      .png()
      .toBuffer()
    const result = await validateAndProcessImage(oversized, 'huge.png', 'image/png')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/corrompido/)
  }, 30000)

  it('rejects an image whose single axis exceeds MAX_DIMENSION while staying under the total pixel budget', async () => {
    // 8001 x 1 = 8,001 px total (well under MAX_PIXELS), but width alone
    // exceeds MAX_DIMENSION (8000) -- this is the case that actually reaches
    // the explicit dimension check.
    const tall = await sharp({ create: { width: 8001, height: 1, channels: 3, background: { r: 1, g: 1, b: 1 } } })
      .png()
      .toBuffer()
    const result = await validateAndProcessImage(tall, 'thin.png', 'image/png')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/dimensoes invalidas/)
  }, 30000)

  it('a path-traversal-shaped filename does not bypass extension validation (extname takes only the last segment)', async () => {
    const result = await validateAndProcessImage(await pngBuffer(), '../../../etc/passwd.png', 'image/png')
    // Still a valid PNG under a valid extension -- this function only judges
    // content vs. claimed format, never the path. Path/key safety is a
    // storage-layer concern (see media-storage-provider.e2e-spec.ts):
    // MediaService never uses the client's filename as a storage key.
    expect(result.ok).toBe(true)
  })
})
