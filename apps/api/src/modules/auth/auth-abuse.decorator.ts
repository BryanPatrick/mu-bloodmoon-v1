import { SetMetadata } from '@nestjs/common'

export type AuthAbusePolicy = 'login' | 'register' | 'refresh' | 'sensitive' | 'recovery'

export type AuthAbuseOptions = {
  policy: AuthAbusePolicy
  captchaAction?: 'login' | 'register' | 'recovery'
  subjectField?: string
}

export const AUTH_ABUSE_OPTIONS = 'auth-abuse-options'

export const AuthAbuseProtection = (options: AuthAbuseOptions) =>
  SetMetadata(AUTH_ABUSE_OPTIONS, options)
