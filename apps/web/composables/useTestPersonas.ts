import { roleFromApi } from '~/features/auth/role-from-api'

// Browser-automation and dev-switcher interface for Test Personas. Every
// call here goes straight to the API's /test-personas/* routes -- routes
// that only exist at all when the backend's own environment/database guard
// (apps/api/src/modules/test-personas/test-personas.env.ts) allowed
// TestPersonasModule to register. Outside that environment these calls just
// 404, the same as any other unregistered route; nothing here can activate
// a persona in an environment the backend itself doesn't allow.
//
// activatePersona() reuses useAuth().saveSession() -- the exact same
// session-hydration path a real interactive login uses -- so a switched
// persona is indistinguishable, from the rest of the app's point of view,
// from a real logged-in user: same cookie, same localStorage session, same
// guards, same RBAC.

export type TestPersonaId =
  | 'PLAYER'
  | 'GM'
  | 'ADMIN'
  | 'SUPER_ADMIN'
  | 'GUILD_LEADER'
  | 'GUILD_OFFICER'
  | 'GUILD_TREASURER'
  | 'GUILD_MEMBER'
  | 'GUILD_RECRUIT'

type ActivateResponse = {
  accessToken: string
  refreshToken: string
  persona: TestPersonaId
  user: { id: string; username: string; role: string }
  guild?: { slug: string; tag: string; roleKey: string }
}

export const useTestPersonas = () => {
  const auth = useAuth()

  const apiBase = () => {
    const config = useRuntimeConfig()
    return String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, '')
  }

  const isAvailable = async (): Promise<boolean> => {
    try {
      await $fetch(`${apiBase()}/test-personas/available`)
      return true
    } catch {
      return false
    }
  }

  const listAvailable = async (): Promise<TestPersonaId[]> => {
    try {
      const res = await $fetch<{ personas: TestPersonaId[] }>(`${apiBase()}/test-personas/available`)
      return res.personas
    } catch {
      return []
    }
  }

  const activatePersona = async (persona: TestPersonaId): Promise<ActivateResponse> => {
    const response = await $fetch<ActivateResponse>(`${apiBase()}/test-personas/activate`, {
      method: 'POST',
      body: { persona }
    })

    auth.saveSession(
      {
        id: response.user.id,
        username: response.user.username,
        name: response.user.username,
        role: roleFromApi(response.user.role),
        currencies: [],
        permissions: [],
        twoFactorEnabled: false
      },
      { accessToken: response.accessToken, refreshToken: response.refreshToken }
    )

    return response
  }

  const resetPersonas = async (): Promise<void> => {
    await $fetch(`${apiBase()}/test-personas/reset`, { method: 'POST' })
  }

  return { isAvailable, listAvailable, activatePersona, resetPersonas }
}
