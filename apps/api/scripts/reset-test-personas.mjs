// npm run test:personas:reset
//
// Removes every Test Persona fixture (accounts, characters, the Test Persona
// Guild) and leaves the database ready for a fresh provisioning round on the
// next activate() call. Guarded by the exact same environment/database check
// the API itself uses (test-personas.env.ts) -- this script refuses to run
// anywhere that check fails, including against a real database by accident.
import 'reflect-metadata'

async function main() {
  const { isTestPersonaEnvironmentSafe } = await import('../dist/apps/api/src/modules/test-personas/test-personas.env.js')
  if (!isTestPersonaEnvironmentSafe()) {
    console.error('ABORT: this environment/database is not allow-listed for Test Personas (TEST_PERSONA_MODE, NODE_ENV, DATABASE_URL).')
    process.exitCode = 1
    return
  }

  const { NestFactory } = await import('@nestjs/core')
  const { AppModule } = await import('../dist/apps/api/src/app.module.js')
  const { TestPersonaService } = await import('../dist/apps/api/src/modules/test-personas/test-personas.service.js')

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
  try {
    const personas = app.get(TestPersonaService)
    const result = await personas.reset()
    console.log(`Test Personas reset: removed ${result.removedAccounts} account(s); guild removed: ${result.removedGuild}`)
  } finally {
    await app.close()
  }
}

main().catch((error) => {
  console.error('Test Personas reset failed:', error && error.message ? error.message : error)
  process.exitCode = 1
})
