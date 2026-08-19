import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (file) => readFileSync(join(root, file), 'utf8')
const failures = []

const env = read('src/modules/test-personas/test-personas.env.ts')
const service = read('src/modules/test-personas/test-personas.service.ts')
const module_ = read('src/modules/test-personas/test-personas.module.ts')
const controller = read('src/modules/test-personas/test-personas.controller.ts')
const appModule = read('src/app.module.ts')

if (!env.includes('TEST_PERSONA_MODE')) failures.push('Missing TEST_PERSONA_MODE opt-in flag in test-personas.env.ts')
if (!env.includes("ALLOWED_NODE_ENVS")) failures.push('Missing NODE_ENV allowlist in test-personas.env.ts')
if (!env.includes('PRODUCTION_DATABASE_MARKER')) failures.push('Missing production-database denylist in test-personas.env.ts')
if (!env.includes('isSuperAdminPersonaAllowed')) failures.push('Missing dedicated SUPER_ADMIN opt-in guard')

// The module must decide registration synchronously via .register() -- a
// request-time-only guard (e.g. a NestJS CanActivate) would still register
// the controller/routes in production, just reject calls to them. The
// requirement here is that the routes never exist at all outside an
// allow-listed environment.
if (!module_.includes('static register(')) failures.push('TestPersonasModule must decide registration via a static register() factory')
if (!module_.includes('isTestPersonaEnvironmentSafe')) failures.push('TestPersonasModule.register() must consult isTestPersonaEnvironmentSafe()')
if (!appModule.includes('TestPersonasModule.register()')) failures.push('app.module.ts must import TestPersonasModule.register(), not TestPersonasModule directly')

for (const forbidden of ['role=', 'req.body.role', 'req.query.role', 'accountId=']) {
  if (controller.includes(forbidden)) failures.push(`Controller must not accept a client-supplied ${forbidden}`)
}
if (!service.includes('ALL_PERSONAS.includes')) failures.push('Service must validate the requested persona against a fixed server-side allowlist')

if (failures.length) {
  console.error(`Test Personas structure check failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`)
  process.exit(1)
}

console.log('Test Personas structure OK')
