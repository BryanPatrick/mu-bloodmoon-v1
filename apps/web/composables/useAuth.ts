import { permissions, roleHasPermission, type Permission, type UserRole } from '~/data/security'

type AuthCurrency = {
  label: string
  value: number
}

type AuthUser = {
  id?: string
  username: string
  name: string
  role: UserRole
  currencies: AuthCurrency[]
  permissions: string[]
}

type AuthSession = {
  user: AuthUser
  createdAt: number
  expiresAt: number
  lastSeenAt: number
  accessToken?: string
  refreshToken?: string
  tokenRefreshedAt?: number
}

type LoginResult = {
  ok: boolean
  message: string
  requiresTwoFactor?: boolean
}

type ApiLoginResponse = {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    username: string
    name: string
    role: string
    permissions: string[]
    twoFactorEnabled: boolean
    currencies?: Array<{
      currency: string
      balance: number
    }>
  }
}

type AuthStateCookie = {
  user: AuthUser
  expiresAt: number
}

export type AuditEvent = {
  id: string
  type: string
  message: string
  user: string
  role: UserRole | 'guest'
  createdAt: string
  meta?: Record<string, string | number | boolean>
}

const authStorageKey = 'blood-moon-auth'
const auditStorageKey = 'blood-moon-audit-log'
const maxAuditEvents = 150
const playerSessionMs = 24 * 60 * 60 * 1000
const adminSessionMs = 8 * 60 * 60 * 1000

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const sessionDurationFor = (role: UserRole) =>
  role === 'admin' || role === 'super-admin' ? adminSessionMs : playerSessionMs

const readJson = <T>(key: string, fallback: T): T => {
  if (!import.meta.client) {
    return fallback
  }

  try {
    const saved = localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as T) : fallback
  } catch {
    localStorage.removeItem(key)
    return fallback
  }
}

const writeJson = (key: string, value: unknown) => {
  if (import.meta.client) {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

const apiCurrencyLabels: Record<string, string> = {
  WCOIN: 'WCoin',
  GOBLIN_POINT: 'Goblin Point',
  HUNT_POINT: 'Hunt Point'
}

const currenciesFromApi = (currencies?: ApiLoginResponse['user']['currencies']) =>
  (currencies || []).map((currency) => ({
    label: apiCurrencyLabels[currency.currency] || currency.currency,
    value: currency.balance
  }))

const roleFromApi = (role: string): UserRole => {
  const normalized = role.toLowerCase().replaceAll('_', '-') as UserRole
  return ['player', 'admin', 'super-admin'].includes(normalized) ? normalized : 'player'
}

export const useAuth = () => {
  const user = useState<AuthUser | null>('blood-moon-auth-user', () => null)
  const session = useState<AuthSession | null>('blood-moon-auth-session', () => null)
  const authStateCookie = useCookie<AuthStateCookie | null>('blood-moon-auth-state', {
    default: () => null,
    sameSite: 'lax',
    secure: !import.meta.dev,
    maxAge: playerSessionMs / 1000
  })

  const isLoggedIn = computed(() => Boolean(user.value))
  const isAdmin = computed(() =>
    roleHasPermission(user.value?.role, permissions.adminDashboardView)
  )
  const accessToken = computed(() => session.value?.accessToken || '')

  const recordAudit = (
    event: Omit<AuditEvent, 'id' | 'createdAt' | 'user' | 'role'> & {
      user?: string
      role?: UserRole | 'guest'
    }
  ) => {
    if (!import.meta.client) {
      return
    }

    const events = readJson<AuditEvent[]>(auditStorageKey, [])
    const nextEvent: AuditEvent = {
      id: createId(),
      type: event.type,
      message: event.message,
      user: event.user || user.value?.username || 'guest',
      role: event.role || user.value?.role || 'guest',
      createdAt: new Date().toISOString(),
      meta: event.meta
    }

    writeJson(auditStorageKey, [nextEvent, ...events].slice(0, maxAuditEvents))
  }

  const saveSession = (
    nextUser: AuthUser,
    tokens?: { accessToken?: string; refreshToken?: string }
  ) => {
    const now = Date.now()
    const nextSession: AuthSession = {
      user: nextUser,
      createdAt: now,
      expiresAt: now + sessionDurationFor(nextUser.role),
      lastSeenAt: now,
      accessToken: tokens?.accessToken,
      refreshToken: tokens?.refreshToken,
      tokenRefreshedAt: now
    }

    user.value = nextUser
    session.value = nextSession
    authStateCookie.value = {
      user: nextUser,
      expiresAt: nextSession.expiresAt
    }
    writeJson(authStorageKey, nextSession)
  }

  const clearSession = () => {
    user.value = null
    session.value = null
    authStateCookie.value = null

    if (import.meta.client) {
      localStorage.removeItem(authStorageKey)
    }
  }

  const refreshSession = async () => {
    const refreshToken = session.value?.refreshToken
    if (!refreshToken) return false

    const config = useRuntimeConfig()
    const apiBase = String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, '')
    try {
      const response = await $fetch<ApiLoginResponse>(`${apiBase}/auth/refresh`, {
        method: 'POST',
        body: { refreshToken }
      })
      const nextUser: AuthUser = {
        id: response.user.id,
        username: response.user.username,
        name: response.user.name,
        role: roleFromApi(response.user.role),
        currencies: currenciesFromApi(response.user.currencies),
        permissions: response.user.permissions || []
      }
      saveSession(nextUser, response)
      return true
    } catch {
      return false
    }
  }

  const loadSession = () => {
    if (import.meta.server) {
      const cookieState = authStateCookie.value
      if (cookieState?.user && cookieState.expiresAt > Date.now()) {
        user.value = cookieState.user
      } else {
        user.value = null
      }
      return
    }

    if (user.value) {
      if (!session.value) {
        const savedSession = readJson<AuthSession | null>(authStorageKey, null)
        if (savedSession?.user && savedSession.expiresAt > Date.now()) {
          session.value = savedSession
        }
      }
      if (session.value) {
        session.value = {
          ...session.value,
          lastSeenAt: Date.now()
        }
        writeJson(authStorageKey, session.value)
        if (
          Date.now() - (session.value.tokenRefreshedAt || session.value.createdAt) >
          10 * 60 * 1000
        ) {
          void refreshSession()
        }
      }
      return
    }

    const savedSession = readJson<AuthSession | null>(authStorageKey, null)
    if (!savedSession?.user) {
      return
    }

    if (savedSession.expiresAt <= Date.now()) {
      recordAudit({
        type: 'auth.session.expired',
        message: 'Sessao expirada automaticamente.',
        user: savedSession.user.username,
        role: savedSession.user.role
      })
      clearSession()
      return
    }

    const nextSession = {
      ...savedSession,
      lastSeenAt: Date.now()
    }

    user.value = savedSession.user
    session.value = nextSession
    writeJson(authStorageKey, nextSession)
    if (Date.now() - (savedSession.tokenRefreshedAt || savedSession.createdAt) > 10 * 60 * 1000) {
      void refreshSession()
    }
  }

  const loginWithApi = async (
    username: string,
    password: string,
    totpCode: string | undefined,
    captchaToken: string
  ): Promise<LoginResult> => {
    const config = useRuntimeConfig()
    const apiBase = String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, '')

    try {
      const response = await $fetch<ApiLoginResponse>(`${apiBase}/auth/login`, {
        method: 'POST',
        body: { username, password, captchaToken, ...(totpCode ? { totpCode } : {}) }
      })
      const nextUser: AuthUser = {
        id: response.user.id,
        username: response.user.username,
        name: response.user.name,
        role: roleFromApi(response.user.role),
        currencies: currenciesFromApi(response.user.currencies),
        permissions: response.user.permissions || []
      }

      saveSession(nextUser, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken
      })
      recordAudit({
        type: 'auth.login.success',
        message: 'Login realizado com sucesso pela API.',
        user: nextUser.username,
        role: nextUser.role
      })

      return {
        ok: true,
        message:
          nextUser.role === 'admin' || nextUser.role === 'super-admin'
            ? 'Login administrativo realizado pela API.'
            : 'Login realizado com sucesso.'
      }
    } catch (error) {
      const failure = error as {
        status?: number
        statusCode?: number
        response?: { status?: number }
        data?: { code?: string }
      }
      const status = failure.response?.status || failure.statusCode || failure.status
      if (failure.data?.code === 'TWO_FACTOR_REQUIRED') {
        return {
          ok: false,
          requiresTwoFactor: true,
          message: 'Digite o codigo de 6 digitos do seu autenticador.'
        }
      }
      return {
        ok: false,
        message:
          status === 401
            ? 'Usuario ou senha invalidos.'
            : status === 429
              ? 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
              : status === 400
                ? 'A verificacao de seguranca expirou ou nao foi validada.'
                : 'Nao foi possivel acessar a API. Tente novamente em instantes.'
      }
    }
  }

  const loginWithCredentials = async (
    username: string,
    password: string,
    totpCode: string | undefined,
    captchaToken: string
  ): Promise<LoginResult> => {
    return loginWithApi(username, password, totpCode, captchaToken)
  }

  const logout = async () => {
    const previousUser = user.value
    const accessToken = session.value?.accessToken

    if (accessToken) {
      const config = useRuntimeConfig()
      const apiBase = String(config.public.apiBase || 'http://localhost:3333/api').replace(
        /\/$/,
        ''
      )

      try {
        await $fetch(`${apiBase}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } catch {
        // A sessao local deve ser encerrada mesmo quando a API estiver indisponivel.
      }
    }

    clearSession()

    if (previousUser) {
      recordAudit({
        type: 'auth.logout',
        message: 'Usuario saiu da conta.',
        user: previousUser.username,
        role: previousUser.role
      })
    }
  }

  const hasPermission = (permission: Permission) => {
    const explicit = user.value?.permissions
    if (explicit?.length) return explicit.includes('*') || explicit.includes(permission)
    return roleHasPermission(user.value?.role, permission)
  }

  const requirePermission = (permission: Permission) => {
    loadSession()
    return hasPermission(permission)
  }

  const getAuditLogs = () => readJson<AuditEvent[]>(auditStorageKey, [])

  const clearAuditLogs = () => {
    writeJson(auditStorageKey, [])
    recordAudit({
      type: 'admin.audit.clear',
      message: 'Auditoria limpa pelo administrador.'
    })
  }

  return {
    user,
    session,
    accessToken,
    isLoggedIn,
    isAdmin,
    loadSession,
    loginWithCredentials,
    refreshSession,
    logout,
    hasPermission,
    requirePermission,
    recordAudit,
    getAuditLogs,
    clearAuditLogs
  }
}
