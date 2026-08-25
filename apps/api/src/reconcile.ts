import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { GameProvisioningReconciliationService } from './modules/game-provisioning-reconciliation/game-provisioning-reconciliation.service'

const logger = new Logger('GameProvisioningReconciliationRunner')

async function main() {
  // The production scheduler invokes one bounded pass. Disable the in-process
  // interval before Nest initializes so a CLI run never creates a second loop.
  process.env.GAME_PROVISIONING_RECONCILIATION_ENABLED = 'false'

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn']
  })

  try {
    const reconciliation = app.get(GameProvisioningReconciliationService)
    const result = await reconciliation.runOnce()
    logger.log(
      `Reconciliation pass completed: scanned=${result.scanned} acted=${result.acted} ` +
        `backoff=${result.skippedBackoff} ceiling=${result.skippedAttemptCeiling} errors=${result.errors}`
    )
  } finally {
    await app.close()
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  logger.error(`Reconciliation runner failed: ${message.slice(0, 191)}`)
  process.exitCode = 1
})
