// npm run media:cleanup:orphans -- [--apply] [--older-than-hours=24]
//
// Sweeps TEMPORARY/REJECTED CommunityMedia rows (upload requests that never
// finished validating, or that were rejected) whose quarantine file has sat
// unreviewed past the age window, and removes both the row and the file.
// Defaults to a dry run -- reports what it would do without deleting
// anything -- so this is safe to run against any environment; pass --apply
// to actually delete. Not a production cron: run manually, locally.
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
        ? `DRY RUN: ${result.scanned} orphan candidate(s) found. Re-run with --apply to delete.`
        : `Deleted ${result.deletedFiles} file(s) and ${result.deletedRows} row(s) out of ${result.scanned} candidate(s).`
    )
  } finally {
    await app.close()
  }
}

main().catch((error) => {
  console.error('Media orphan cleanup failed:', error && error.message ? error.message : error)
  process.exitCode = 1
})
