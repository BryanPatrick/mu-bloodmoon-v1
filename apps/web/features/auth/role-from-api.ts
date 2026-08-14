// Pure mapping from the backend's Role enum string ('PLAYER' | 'GM' | 'ADMIN' | 'SUPER_ADMIN')
// to the frontend's UserRole literal ('player' | 'gm' | 'admin' | 'super-admin').
// Extracted out of composables/useAuth.ts specifically so it's unit-testable
// without a Nuxt/Vue mounting environment -- see test/rbac-gm-role.test.mjs.
//
// The whitelist here is a deliberate safety net: any role string that isn't
// recognized falls back to 'player' rather than throwing or passing through
// an invalid value. Forgetting to add a newly introduced backend role to this
// list silently downgrades that role's users to 'player' on the frontend --
// this is exactly the bug that shipped once for the GM role and must not
// repeat for any future role.

export type FrontendUserRole = 'player' | 'gm' | 'admin' | 'super-admin'

const knownRoles: FrontendUserRole[] = ['player', 'gm', 'admin', 'super-admin']

export function roleFromApi(role: string): FrontendUserRole {
  const normalized = role.toLowerCase().replaceAll('_', '-') as FrontendUserRole
  return knownRoles.includes(normalized) ? normalized : 'player'
}
