export type LoginRequest = {
  username: string
  password: string
}

export type RegisterRequest = {
  name: string
  username: string
  password: string
  personalId: string
  email: string
  reference?: string
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
  currencies: Array<{
    currency: string
    balance: number
  }>
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
