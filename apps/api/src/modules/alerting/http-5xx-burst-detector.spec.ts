import { Http5xxBurstDetector } from './http-5xx-burst-detector'

describe('Http5xxBurstDetector', () => {
  const ENV_KEYS = [
    'HTTP_5XX_BURST_DETECTION_ENABLED',
    'HTTP_5XX_BURST_THRESHOLD',
    'HTTP_5XX_BURST_WINDOW_MS',
    'HTTP_5XX_BURST_COOLDOWN_MS'
  ] as const
  const originalEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key]
    process.env.HTTP_5XX_BURST_THRESHOLD = '3'
    process.env.HTTP_5XX_BURST_WINDOW_MS = '10000'
    process.env.HTTP_5XX_BURST_COOLDOWN_MS = '60000'
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key]
      else process.env[key] = originalEnv[key]
    }
  })

  it('does not fire below the threshold', () => {
    const detector = new Http5xxBurstDetector()
    expect(detector.recordAndCheck(1000)).toBe(false)
    expect(detector.recordAndCheck(1100)).toBe(false)
  })

  it('fires exactly once when the threshold is crossed within the window', () => {
    const detector = new Http5xxBurstDetector()
    expect(detector.recordAndCheck(1000)).toBe(false)
    expect(detector.recordAndCheck(1100)).toBe(false)
    expect(detector.recordAndCheck(1200)).toBe(true)
    // Still bursting, but inside its own cooldown -- must not fire again.
    expect(detector.recordAndCheck(1300)).toBe(false)
    expect(detector.recordAndCheck(1400)).toBe(false)
  })

  it('does not count occurrences that fall outside the sliding window', () => {
    const detector = new Http5xxBurstDetector()
    expect(detector.recordAndCheck(0)).toBe(false)
    expect(detector.recordAndCheck(1000)).toBe(false)
    // 15s later: the two earlier hits (0, 1000) are now outside a 10s window.
    expect(detector.recordAndCheck(15000)).toBe(false)
    expect(detector.currentCount(15000)).toBe(1)
  })

  it('fires again after its own cooldown elapses', () => {
    const detector = new Http5xxBurstDetector()
    detector.recordAndCheck(0)
    detector.recordAndCheck(100)
    expect(detector.recordAndCheck(200)).toBe(true)
    // Cooldown is 60000ms (until 60200); a fresh burst starting well after
    // that, with enough occurrences inside the 10s window to cross the
    // threshold again, must fire.
    expect(detector.recordAndCheck(61000)).toBe(false)
    expect(detector.recordAndCheck(61050)).toBe(false)
    expect(detector.recordAndCheck(61100)).toBe(true)
  })

  it('never fires when detection is disabled', () => {
    process.env.HTTP_5XX_BURST_DETECTION_ENABLED = 'false'
    const detector = new Http5xxBurstDetector()
    expect(detector.recordAndCheck(0)).toBe(false)
    expect(detector.recordAndCheck(100)).toBe(false)
    expect(detector.recordAndCheck(200)).toBe(false)
  })

  it('reset() clears state', () => {
    const detector = new Http5xxBurstDetector()
    detector.recordAndCheck(0)
    detector.recordAndCheck(100)
    detector.recordAndCheck(200)
    detector.reset()
    expect(detector.currentCount(200)).toBe(0)
  })
})
