import { permissions, roleHasPermission, type Permission, type UserRole } from '~/data/security'

type AuthCurrency = {
  label: string
  value: number
}

type AuthUser = {
  username: string
  name: string
  role: UserRole
  currencies: AuthCurrency[]
}

type AuthSession = {
  user: AuthUser
  createdAt: number
  expiresAt: number
  lastSeenAt: number
  accessToken?: string
  refreshToken?: string
}

type LoginResult = {
  ok: boolean
  message: string
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
    currencies?: Array<{
      currency: string
      balance: number
    }>
  }
}

type LoginAttemptState = {
  count: number
  lockedUntil: number
}

type StoredManagedAccount = {
  username: string
  name?: string
  role?: UserRole
  status?: string
  currencies?: Record<string, number>
}

type StoredManagementState = {
  accounts?: StoredManagedAccount[]
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
const managementStorageKey = 'blood-moon-management-state'
const attemptsStorageKey = 'blood-moon-login-attempts'
const auditStorageKey = 'blood-moon-audit-log'
const maxAuditEvents = 150
const maxLoginAttempts = 5
const lockDurationMs = 5 * 60 * 1000
const playerSessionMs = 24 * 60 * 60 * 1000
const adminSessionMs = 8 * 60 * 60 * 1000

const demoUsers: Record<string, AuthUser & { password: string }> = {
  admin: {
    username: 'admin',
    password: 'admin',
    name: 'admin',
    role: 'admin',
    currencies: [
      { label: 'WCoin', value: 1250 },
      { label: 'Goblin Point', value: 340 },
      { label: 'Hunt Point', value: 8750 }
    ]
  },
  player: {
    username: 'player',
    password: 'player',
    name: 'player',
    role: 'player',
    currencies: [
      { label: 'WCoin', value: 50 },
      { label: 'Goblin Point', value: 0 },
      { label: 'Hunt Point', value: 320 }
    ]
  }
}

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const sanitizeUser = (user: AuthUser & { password?: string }): AuthUser => ({
  username: user.username,
  name: user.name,
  role: user.role,
  currencies: user.currencies
})

const sessionDurationFor = (role: UserRole) => (role === 'admin' || role === 'super-admin' ? adminSessionMs : playerSessionMs)

const readJson = <T>(key: string, fallback: T): T => {
  if (!import.meta.client) {
    return fallback
  }

  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) as T : fallback
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

const currencyRecordToList = (currencies?: Record<string, number>) =>
  Object.entries(currencies || {}).map(([label, value]) => ({ label, value }))

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
  return ['player', 'moderator', 'game-master', 'admin', 'super-admin'].includes(normalized)
    ? normalized
    : 'player'
}

const getStoredManagedAccount = (username: string) => {
  const managementState = readJson<StoredManagementState | null>(managementStorageKey, null)
  return managementState?.accounts?.find((account) => account.username === username)
}

const mergeUserWithManagedAccount = (nextUser: AuthUser): AuthUser => {
  const managedAccount = getStoredManagedAccount(nextUser.username)
  if (!managedAccount) {
    return nextUser
  }

  return {
    ...nextUser,
    name: managedAccount.name || nextUser.name,
    role: managedAccount.role || nextUser.role,
    currencies: managedAccount.currencies ? currencyRecordToList(managedAccount.currencies) : nextUser.currencies
  }
}

export const useAuth = () => {
  const user = useState<AuthUser | null>('blood-moon-auth-user', () => null)
  const session = useState<AuthSession | null>('blood-moon-auth-session', () => null)

  const isLoggedIn = computed(() => Boolean(user.value))
  const isAdmin = computed(() => roleHasPermission(user.value?.role, permissions.adminDashboardView))

  const recordAudit = (event: Omit<AuditEvent, 'id' | 'createdAt' | 'user' | 'role'> & { user?: string, role?: UserRole | 'guest' }) => {
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

  const saveSession = (nextUser: AuthUser, tokens?: { accessToken?: string; refreshToken?: string }) => {
    const now = Date.now()
    const nextSession: AuthSession = {
      user: nextUser,
      createdAt: now,
      expiresAt: now + sessionDurationFor(nextUser.role),
      lastSeenAt: now,
      accessToken: tokens?.accessToken,
      refreshToken: tokens?.refreshToken
    }

    user.value = nextUser
    session.value = nextSession
    writeJson(authStorageKey, nextSession)
  }

  const clearSession = () => {
    user.value = null
    session.value = null

    if (import.meta.client) {
      localStorage.removeItem(authStorageKey)
    }
  }

  const loadSession = () => {
    if (!import.meta.client) {
      return
    }

    if (user.value) {
      const managedAccount = getStoredManagedAccount(user.value.username)
      if (managedAccount?.status === 'Bloqueada') {
        recordAudit({
          type: 'auth.session.blocked',
          message: 'Sessao encerrada por conta bloqueada.',
          user: user.value.username,
          role: user.value.role,
          meta: { status: managedAccount.status }
        })
        clearSession()
        return
      }

      const refreshedUser = mergeUserWithManagedAccount(user.value)
      user.value = refreshedUser
      if (session.value) {
        session.value = {
          ...session.value,
          user: refreshedUser,
          lastSeenAt: Date.now()
        }
        writeJson(authStorageKey, session.value)
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

    const savedManagedAccount = getStoredManagedAccount(savedSession.user.username)
    if (savedManagedAccount?.status === 'Bloqueada') {
      recordAudit({
        type: 'auth.session.blocked',
        message: 'Sessao encerrada por conta bloqueada.',
        user: savedSession.user.username,
        role: savedSession.user.role,
        meta: { status: savedManagedAccount.status }
      })
      clearSession()
      return
    }

    const refreshedUser = mergeUserWithManagedAccount(savedSession.user)
    const nextSession = {
      ...savedSession,
      user: refreshedUser,
      lastSeenAt: Date.now()
    }

    user.value = refreshedUser
    session.value = nextSession
    writeJson(authStorageKey, nextSession)
  }

  const getAttemptState = () => readJson<LoginAttemptState>(attemptsStorageKey, { count: 0, lockedUntil: 0 })

  const resetAttempts = () => {
    if (import.meta.client) {
      localStorage.removeItem(attemptsStorageKey)
    }
  }

  const registerFailedAttempt = () => {
    const current = getAttemptState()
    const nextCount = current.lockedUntil > Date.now() ? current.count : current.count + 1
    const nextState: LoginAttemptState = {
      count: nextCount,
      lockedUntil: nextCount >= maxLoginAttempts ? Date.now() + lockDurationMs : 0
    }

    writeJson(attemptsStorageKey, nextState)
    return nextState
  }

  const loginWithApi = async (username: string, password: string): Promise<LoginResult | null> => {
    const config = useRuntimeConfig()
    const apiBase = String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, '')

    try {
      const response = await $fetch<ApiLoginResponse>(`${apiBase}/auth/login`, {
        method: 'POST',
        body: { username, password }
      })
      const nextUser: AuthUser = {
        username: response.user.username,
        name: response.user.name,
        role: roleFromApi(response.user.role),
        currencies: currenciesFromApi(response.user.currencies)
      }

      saveSession(nextUser, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken
      })
      resetAttempts()
      recordAudit({
        type: 'auth.login.success',
        message: 'Login realizado com sucesso pela API.',
        user: nextUser.username,
        role: nextUser.role
      })

      return {
        ok: true,
        message: nextUser.role === 'admin'
          ? 'Login realizado como administrador pela API.'
          : 'Login realizado com sucesso.'
      }
    } catch {
      return null
    }
  }

  const loginWithCredentials = async (username: string, password: string): Promise<LoginResult> => {
    const apiResult = await loginWithApi(username, password)
    if (apiResult) {
      return apiResult
    }

    return {
      ok: false,
      message: 'Nao foi possivel autenticar pela API. Verifique se o backend esta ligado.'
    }
  }

  const loginDemoAdmin = () => {
    const admin = sanitizeUser(demoUsers.admin)
    saveSession(admin)
    resetAttempts()
    recordAudit({
      type: 'auth.login.success',
      message: 'Login de teste realizado como administrador.',
      user: admin.username,
      role: admin.role
    })
  }

  const logout = async () => {
    const previousUser = user.value
    const accessToken = session.value?.accessToken

    if (accessToken) {
      const config = useRuntimeConfig()
      const apiBase = String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, '')

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

  const hasPermission = (permission: Permission) => roleHasPermission(user.value?.role, permission)

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
    isLoggedIn,
    isAdmin,
    loadSession,
    loginDemoAdmin,
    loginWithCredentials,
    logout,
    hasPermission,
    requirePermission,
    recordAudit,
    getAuditLogs,
    clearAuditLogs
  }
}
