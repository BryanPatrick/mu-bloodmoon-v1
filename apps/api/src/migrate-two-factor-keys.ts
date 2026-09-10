import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { PrismaService } from './database/prisma.service'
import { TwoFactorService } from './modules/auth/two-factor.service'

// Security hardening -- 2FA keyring migration (v1 -> active version).
// Same standalone application-context pattern as reconcile.ts: runs inside
// the app's own environment (cPanel's "Run JS script", or locally against
// bloodmoon_local_claude for testing) so it reads TWO_FACTOR_ENCRYPTION_KEY
// and TWO_FACTOR_ENCRYPTION_KEY_{VERSION} straight from process.env --
// never printed, never passed as an argument, never seen by the operator.
//
// Resumable/idempotent by construction: every pass re-queries for accounts
// whose twoFactorSecret/twoFactorPending is not already on the active
// version. A row that's already migrated simply stops matching the query,
// so re-running this script (after an interruption, or just to confirm
// nothing is left) is always safe and never re-touches finished rows.
//
// --dry-run: decrypts every candidate row and re-encrypts in memory only
// (proving both keys work end-to-end for that row) but writes nothing.
// Real run: same decrypt+re-encrypt, persisted via a single-row `update`
// (already atomic at the row level -- no multi-row transaction needed).
const logger = new Logger('TwoFactorKeyMigration')
const BATCH_SIZE = 50

export interface Summary {
  scanned: number
  migrated: number
  alreadyCurrent: number
  failed: number
  failedAccountIds: string[]
}

export function emptySummary(): Summary {
  return { scanned: 0, migrated: 0, alreadyCurrent: 0, failed: 0, failedAccountIds: [] }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || process.env.TWO_FACTOR_KEY_MIGRATION_DRY_RUN === 'true'
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] })

  try {
    const prisma = app.get(PrismaService)
    const twoFactor = app.get(TwoFactorService)
    const activeVersion = twoFactor.activeVersion()

    // Part I -- keyring availability self-test before touching any real
    // row. Also implicitly proves v1 is still readable: if the active
    // version were already v1 there would be nothing to migrate, so this
    // script only does meaningful work when a v2+ version is active,
    // which requires v1's own key to remain configured for backward reads.
    const probe = twoFactor.encrypt('migration-self-test-probe')
    if (twoFactor.decrypt(probe) !== 'migration-self-test-probe') {
      throw new Error('SELF_TEST_FAILED: active key version round-trip mismatch')
    }
    if (activeVersion === 'v1') {
      logger.warn(
        'TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION is still v1 -- nothing to migrate. ' +
          'Set it to v2 (with TWO_FACTOR_ENCRYPTION_KEY_V2 configured) before running this for real.'
      )
      return
    }
    logger.log(`Self-test passed. Active key version: ${activeVersion}. Mode: ${dryRun ? 'DRY RUN' : 'REAL'}`)

    const summary: Summary = emptySummary()

    if (dryRun) {
      await dryRunPass(prisma, twoFactor, activeVersion, summary)
    } else {
      await realRunPass(prisma, twoFactor, activeVersion, summary)
    }

    logger.log(
      `Done. scanned=${summary.scanned} migrated=${summary.migrated} ` +
        `alreadyCurrent=${summary.alreadyCurrent} failed=${summary.failed}` +
        (summary.failed > 0 ? ` failedAccountIds=${summary.failedAccountIds.join(',')}` : '')
    )
    if (summary.failed > 0) process.exitCode = 1
  } finally {
    await app.close()
  }
}

// Read-only: pages through every account with a 2FA secret via a stable
// id-based cursor (nothing gets updated, so offset-based paging would
// still be safe, but a cursor is used anyway to match the real-run path's
// shape and avoid relying on row-count-shrinks-as-you-go semantics here).
//
// accountIds is test-only scoping: production's own main() below never
// passes it, so the real migration always remains genuinely global
// (every account in the table, by design -- that's its actual job).
// two-factor-key-migration.e2e-spec.ts passes its own created account
// id(s) so its assertions are immune to a concurrent process (another
// session, another suite) exercising this same global function against
// the same shared local dev database mid-test.
export async function dryRunPass(
  prisma: PrismaService,
  twoFactor: TwoFactorService,
  activeVersion: string,
  summary: Summary,
  accountIds?: string[]
) {
  let cursor: string | undefined
  for (;;) {
    const batch = await prisma.account.findMany({
      where: {
        OR: [{ twoFactorSecret: { not: null } }, { twoFactorPending: { not: null } }],
        ...(accountIds ? { id: { in: accountIds } } : {})
      },
      select: { id: true, twoFactorSecret: true, twoFactorPending: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
    })
    if (batch.length === 0) break
    cursor = batch[batch.length - 1].id

    for (const account of batch) {
      summary.scanned++
      const needsSecret = account.twoFactorSecret && twoFactor.keyVersionOf(account.twoFactorSecret) !== activeVersion
      const needsPending = account.twoFactorPending && twoFactor.keyVersionOf(account.twoFactorPending) !== activeVersion
      if (!needsSecret && !needsPending) {
        summary.alreadyCurrent++
        continue
      }
      try {
        // Decrypt (proves the old key still works) + re-encrypt in memory
        // only (proves the new key works) -- never written.
        if (needsSecret) twoFactor.encrypt(twoFactor.decrypt(account.twoFactorSecret as string))
        if (needsPending) twoFactor.encrypt(twoFactor.decrypt(account.twoFactorPending as string))
        summary.migrated++ // "would migrate" in dry-run terms
      } catch (error) {
        summary.failed++
        summary.failedAccountIds.push(account.id)
        logger.error(`[dry-run] Account ${account.id} would fail re-encryption: ${safeMessage(error)}`)
      }
    }
    if (batch.length < BATCH_SIZE) break
  }
}

// Mutating. Uses the same id-based cursor as dryRunPass so every
// candidate row is visited AT MOST ONCE per invocation, regardless of
// whether it succeeds or fails -- this is the critical property a naive
// "requery for not-yet-migrated" loop does NOT have: a row that fails to
// update (wrong key, corrupted ciphertext, anything) never leaves the
// pending set, so re-running the same unfiltered query would fetch the
// exact same failing row forever and never make progress on anything
// after it. (Caught by the migration's own test suite -- an earlier
// version of this function infinite-looped on a single bad row.) Between
// separate script invocations this is still fully resumable: a fresh run
// starts a fresh cursor from the beginning and naturally skips whatever
// already reached the active version, retrying only what's still pending
// (including previously-failed rows, intentionally -- a transient failure
// deserves another attempt on the next run).
export async function realRunPass(
  prisma: PrismaService,
  twoFactor: TwoFactorService,
  activeVersion: string,
  summary: Summary,
  accountIds?: string[]
) {
  let cursor: string | undefined
  for (;;) {
    const batch = await prisma.account.findMany({
      where: {
        OR: [{ twoFactorSecret: { not: null } }, { twoFactorPending: { not: null } }],
        ...(accountIds ? { id: { in: accountIds } } : {})
      },
      select: { id: true, twoFactorSecret: true, twoFactorPending: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
    })
    if (batch.length === 0) break
    cursor = batch[batch.length - 1].id

    for (const account of batch) {
      const needsSecret = account.twoFactorSecret && twoFactor.keyVersionOf(account.twoFactorSecret) !== activeVersion
      const needsPending = account.twoFactorPending && twoFactor.keyVersionOf(account.twoFactorPending) !== activeVersion
      if (!needsSecret && !needsPending) {
        summary.alreadyCurrent++
        continue
      }
      summary.scanned++
      try {
        const data: { twoFactorSecret?: string; twoFactorPending?: string } = {}
        if (needsSecret) data.twoFactorSecret = twoFactor.encrypt(twoFactor.decrypt(account.twoFactorSecret as string))
        if (needsPending) data.twoFactorPending = twoFactor.encrypt(twoFactor.decrypt(account.twoFactorPending as string))
        await prisma.account.update({ where: { id: account.id }, data })
        summary.migrated++
      } catch (error) {
        summary.failed++
        summary.failedAccountIds.push(account.id)
        logger.error(`Account ${account.id} failed re-encryption, left untouched: ${safeMessage(error)}`)
      }
    }
    if (batch.length < BATCH_SIZE) break
  }
}

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, 191)
}

// Only run as the CLI entrypoint (`node dist/apps/api/src/migrate-two-factor-keys.js`,
// per package.json's migrate:two-factor-keys script). Without this guard,
// two-factor-key-migration.e2e-spec.ts's `await import(...)` of this
// module -- done to reuse dryRunPass/realRunPass/emptySummary -- would
// also unconditionally trigger this real, unscoped, mutating migration
// run against whatever database that test happens to be pointed at, as
// an unawaited side effect racing the test's own explicit calls.
if (require.main === module) {
  void main().catch((error: unknown) => {
    logger.error(`2FA key migration failed: ${safeMessage(error)}`)
    process.exitCode = 1
  })
}
