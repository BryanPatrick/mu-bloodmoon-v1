export type LoginRequest = {
  username: string
  password: string
}

export type SessionUser = {
  id: string
  username: string
  name: string
  role: string
  permissions: string[]
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  user: SessionUser
}
