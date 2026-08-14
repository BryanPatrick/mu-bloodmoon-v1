export type LoginRequest = {
  username: string
  password: string
  totpCode?: string
  recoveryCode?: string
  captchaToken: string
}

export type RefreshRequest = {
  refreshToken: string
}

export type RegisterRequest = {
  name: string
  username: string
  password: string
  personalId: string
  email: string
  reference?: string
  captchaToken: string
}

export type ChangePasswordRequest = {
  currentPassword: string
  personalId: string
  newPassword: string
}

export type SessionUser = {
  id: string
  username: string
  name: string
  role: string
  permissions: string[]
  twoFactorEnabled: boolean
  twoFactorRequired: boolean
  currencies: Array<{
    currency: string
    balance: number
  }>
}

export type TwoFactorSetupRequest = {
  currentPassword: string
}

export type TwoFactorSetupResponse = {
  secret: string
  uri: string
  qrCode: string
}

export type TwoFactorVerifyRequest = {
  code: string
}

export type TwoFactorVerifyResponse = {
  ok: true
  recoveryCodes: string[]
}

export type TwoFactorDisableRequest = {
  currentPassword: string
  code?: string
  recoveryCode?: string
}

export type TwoFactorRecoveryCodesRegenerateRequest = {
  currentPassword: string
  code?: string
  recoveryCode?: string
}

export type TwoFactorRecoveryCodesRegenerateResponse = {
  ok: true
  recoveryCodes: string[]
}

export type StepUpRequest = {
  currentPassword: string
  code?: string
  recoveryCode?: string
}

export type StepUpResponse = {
  stepUpToken: string
  expiresAt: string
}

export type AdminTwoFactorResetRequest = {
  reason: string
}

export type AdminTwoFactorResetResponse = {
  ok: true
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  user: SessionUser
}

export type RegisterResponse = {
  id: string
  username: string
  email: string
  status: string
}

export type ChangePasswordResponse = {
  ok: true
}

export type PasswordRecoveryRequestRequest = {
  email: string
  captchaToken: string
}

export type PasswordRecoveryRequestResponse = {
  ok: true
}

export type PasswordRecoveryResetRequest = {
  token: string
  newPassword: string
}

export type PasswordRecoveryResetResponse = {
  ok: true
}
