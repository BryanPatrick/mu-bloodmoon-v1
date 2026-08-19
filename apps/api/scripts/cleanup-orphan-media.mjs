// npm run media:cleanup:orphans -- [--apply] [--older-than-hours=24]
//
// Sweeps two orphan categories past the age window: TEMPORARY/REJECTED rows
// (upload requests that never finished validating, or were rejected --
// quarantine file and row both deleted, nothing to preserve) and READY rows
// never attached to a post or promoted to an avatar/cover (the file is
// released -- moved out of the served directory, row kept as REMOVED for
// the audit trail, same as any other moderation removal). Defaults to a dry
// run -- reports what it would do without changing anything -- so this is
// safe to run against any environment; pass --apply to actually act. Not a
// production cron: run manually, locally.
import 'reflect-metadata'

function parseArgs(argv) {
  const apply = argv.includes('--apply')
  const hoursArg = argv.find((arg) => arg.startsWith('--older-than-hours='))
  const olderThanHours = hoursArg ? Number(hoursArg.split('=')[1]) : undefined
  return { apply, olderThanHours }
}

async function main() {
  const { apply, olderThanHours } = parseArgs(process.argv.slice(2))

  const { NestFactory } = await import('@nestjs/core')
  const { AppModule } = await import('../dist/apps/api/src/app.module.js')
  const { MediaOrphanCleanupService } = await import('../dist/apps/api/src/modules/media/media-orphan-cleanup.service.js')

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
  try {
    const cleanup = app.get(MediaOrphanCleanupService)
    const result = await cleanup.cleanup({ dryRun: !apply, ...(olderThanHours !== undefined ? { olderThanHours } : {}) })
    console.log(
      result.dryRun
        ? `DRY RUN: ${result.scanned} orphan candidate(s) found. Re-run with --apply to act.`
        : `Deleted ${result.deletedFiles} quarantine file(s)/${result.deletedRows} row(s); released ${result.releasedFiles} READY file(s)/${result.releasedRows} row(s); out of ${result.scanned} candidate(s).`
    )
  } finally {
    await app.close()
  }
}

main().catch((error) => {
  console.error('Media orphan cleanup failed:', error && error.message ? error.message : error)
  process.exitCode = 1
})
