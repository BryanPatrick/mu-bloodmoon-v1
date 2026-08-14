import { createHash } from 'node:crypto'
import type { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser, StepUpTokenPayload } from './auth.types'

// Step-up tokens are deliberately signed with a distinct secret (derived
// from, but different than, the access-token secret) so a step-up token can
// never be replayed as a normal Bearer access token, mirroring how refresh
// tokens already use JWT_REFRESH_SECRET instead of JWT_ACCESS_SECRET.
export const stepUpTokenTtlSeconds = 5 * 60

export function stepUpSecret() {
  const accessSecret =
    process.env.JWT_ACCESS_SECRET ||
    (process.env.NODE_ENV === 'production' ? '' : 'dev-access-secret-change-me')
  if (!accessSecret) throw new Error('JWT_ACCESS_SECRET is required in production')
  return createHash('sha256').update(`${accessSecret}:step-up`).digest('hex')
}

// Shared by StepUpGuard (route-level) and any service that needs an inline
// check (e.g. only when a specific field is present in the payload, which a
// declarative guard can't express). Returns true only for a token that is
// well-formed, unexpired, issued to this exact user, and still matches the
// account's current sessionVersion (so a password/2FA change invalidates
// any step-up token issued before it, same as regular sessions).
export async function verifyStepUpToken(
  jwt: JwtService,
  prisma: PrismaService,
  token: string | undefined,
  user: Pick<AuthenticatedUser, 'id' | 'sessionVersion'>
): Promise<boolean> {
  if (!token) return false
  try {
    const payload = await jwt.verifyAsync<StepUpTokenPayload>(token, { secret: stepUpSecret() })
    if (payload.type !== 'step-up' || payload.sub !== user.id) return false
    const account = await prisma.account.findUnique({ where: { id: payload.sub } })
    if (!account) return false
    return account.sessionVersion === payload.sessionVersion && account.sessionVersion === user.sessionVersion
  } catch {
    return false
  }
}
