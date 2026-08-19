// Test Personas exist only to remove human login/CAPTCHA/2FA friction from
// local development, E2E and browser automation. The two functions below are
// the ONLY gate that decides whether the feature exists at all in a given
// process: isTestPersonaEnvironmentSafe() is read once, synchronously, at
// module-composition time in app.module.ts -- when it is false the whole
// TestPersonasModule (controller, routes, handlers) is never registered, not
// just hidden. A single flag is not enough on its own (a stray
// TEST_PERSONA_MODE=true in the wrong place must not open this up), so three
// independent conditions all have to hold at once: the explicit opt-in flag,
// an allowed NODE_ENV, and a DATABASE_URL that matches a known-safe local/e2e
// database and explicitly does not match the known production database name.

const PRODUCTION_DATABASE_MARKER = /mubloodxz_bloodmoon/i
const ALLOWED_DATABASE_MARKER = /bloodmoon_local|bloodmoon_e2e/i
const ALLOWED_NODE_ENVS = new Set(['development', 'test'])

export function isTestPersonaEnvironmentSafe(): boolean {
  if (process.env.TEST_PERSONA_MODE !== 'true') return false
  if (!ALLOWED_NODE_ENVS.has(process.env.NODE_ENV || '')) return false
  const dbUrl = process.env.DATABASE_URL || ''
  if (!dbUrl) return false
  if (PRODUCTION_DATABASE_MARKER.test(dbUrl)) return false
  return ALLOWED_DATABASE_MARKER.test(dbUrl)
}

// SUPER_ADMIN gets a second, independent opt-in on top of the base guard --
// the highest-privilege persona should never come back just because someone
// turned on TEST_PERSONA_MODE for the others.
export function isSuperAdminPersonaAllowed(): boolean {
  return isTestPersonaEnvironmentSafe() && process.env.TEST_PERSONA_ALLOW_SUPER_ADMIN === 'true'
}

export function testPersonaFixturePassword(): string {
  return process.env.TEST_PERSONA_FIXTURE_PASSWORD || 'TestPersona!Dev2026'
}
