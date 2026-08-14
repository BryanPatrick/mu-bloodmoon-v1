import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { AuditService } from '../audit/audit.service'

type TurnstileResponse = {
  success?: boolean
  hostname?: string
  action?: string
  'error-codes'?: string[]
}

const TURNSTILE_ALWAYS_PASS_TEST_SECRET = '1x0000000000000000000000000000000AA'

@Injectable()
export class CaptchaService {
  constructor(private readonly audit: AuditService) {}

  async verify(token: unknown, expectedAction: string, remoteIp: string | null) {
    // Legacy E2E suites run without external providers. Dedicated abuse tests
    // set a test secret and exercise the complete server-side validation path.
    if (process.env.NODE_ENV === 'test' && process.env.AUTH_CAPTCHA_TEST_BYPASS === '1') return

    const value = typeof token === 'string' ? token.trim() : ''
    if (!value || value.length > 2048) {
      await this.recordFailure(expectedAction, remoteIp, 'missing-or-invalid-token')
      throw new BadRequestException('Nao foi possivel validar a verificacao de seguranca.')
    }

    const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
    if (!secret) {
      await this.recordFailure(expectedAction, remoteIp, 'provider-not-configured')
      throw new ServiceUnavailableException(
        'A verificacao de seguranca esta temporariamente indisponivel.'
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      this.positiveInteger(process.env.TURNSTILE_TIMEOUT_MS, 5000)
    )

    try {
      const body = new URLSearchParams({ secret, response: value })
      if (remoteIp) body.set('remoteip', remoteIp)
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal
      })
      if (!response.ok) throw new Error(`turnstile-http-${response.status}`)

      const result = (await response.json()) as TurnstileResponse
      const allowedHosts = (process.env.TURNSTILE_EXPECTED_HOSTNAMES || '')
        .split(',')
        .map((hostname) => hostname.trim().toLowerCase())
        .filter(Boolean)
      const usesOfficialTestSecret =
        process.env.NODE_ENV !== 'production' && secret === TURNSTILE_ALWAYS_PASS_TEST_SECRET
      const actionMatches = usesOfficialTestSecret || result.action === expectedAction
      const hostnameMatches =
        usesOfficialTestSecret ||
        allowedHosts.length === 0 ||
        Boolean(result.hostname && allowedHosts.includes(result.hostname.toLowerCase()))

      if (!result.success || !actionMatches || !hostnameMatches) {
        await this.recordFailure(
          expectedAction,
          remoteIp,
          !actionMatches
            ? 'action-mismatch'
            : !hostnameMatches
              ? 'hostname-mismatch'
              : 'provider-rejected'
        )
        throw new BadRequestException('Nao foi possivel validar a verificacao de seguranca.')
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error
      await this.recordFailure(expectedAction, remoteIp, 'provider-unavailable')
      throw new ServiceUnavailableException(
        'A verificacao de seguranca esta temporariamente indisponivel.'
      )
    } finally {
      clearTimeout(timeout)
    }
  }

  private recordFailure(action: string, ipAddress: string | null, reason: string) {
    return this.audit.record({
      action: 'auth.captcha_failed',
      targetType: 'Authentication',
      result: 'DENIED',
      severity: 'warning',
      ipAddress,
      metadata: { action, reason }
    })
  }

  private positiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
  }
}
