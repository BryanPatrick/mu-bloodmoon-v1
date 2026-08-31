import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

const CONTAINER = 'bloodmoon-e2e-launcher-cms-repair'
const prismaCli = path.resolve(__dirname, '../../../node_modules/prisma/build/index.js')
const expectedTables = ['LauncherSlotContent', 'LauncherContentPublish', 'LauncherSlotContentRevision', 'LauncherAsset', 'StorePurchaseTerms']
const knowledgeColumns = ['body', 'calendarEnabled', 'entryInfo', 'eventEndsAt', 'eventStartsAt', 'guideUrl', 'launcherEnabled', 'launcherSummary', 'recommendedLevel']

describe('launcher CMS repair migration', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
    prisma = new PrismaClient()
    await prisma.$connect()
  }, 120_000)

  afterAll(async () => {
    await prisma?.$disconnect()
    stopDisposableDatabase(CONTAINER)
  })

  async function assertContractExists() {
    const [{ lowerCaseTableNames }] = await prisma.$queryRaw<Array<{ lowerCaseTableNames: bigint }>>`
      SELECT @@lower_case_table_names AS lowerCaseTableNames`
    const tables = await prisma.$queryRaw<Array<{ TABLE_NAME: string }>>`
      SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${expectedTables[0]}, ${expectedTables[1]}, ${expectedTables[2]}, ${expectedTables[3]}, ${expectedTables[4]})`
    const normalize = Number(lowerCaseTableNames) === 0 ? (value: string) => value : (value: string) => value.toLowerCase()
    expect(tables.map((row) => normalize(row.TABLE_NAME)).sort()).toEqual(expectedTables.map(normalize).sort())
    const columns = await prisma.$queryRaw<Array<{ COLUMN_NAME: string }>>`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'KnowledgeEntry'`
    for (const column of knowledgeColumns) expect(columns.map((row) => row.COLUMN_NAME)).toContain(column)
  }

  function executeRepair() {
    execFileSync(process.execPath, [prismaCli, 'db', 'execute', '--file', 'prisma/migrations/20260830120000_launcher_cms_contract_repair/migration.sql', '--schema', 'prisma/schema.prisma'], {
      cwd: __dirname + '/..', env: process.env, stdio: 'pipe'
    })
  }

  it('is a no-op over a complete fresh baseline', async () => {
    await assertContractExists()
    executeRepair()
    await assertContractExists()
  })

  it('recovers the inconsistent production-shaped state and remains idempotent', async () => {
    for (const table of expectedTables) await prisma.$executeRawUnsafe(`DROP TABLE \`${table}\``)
    for (const column of knowledgeColumns) await prisma.$executeRawUnsafe(`ALTER TABLE \`KnowledgeEntry\` DROP COLUMN \`${column}\``)
    await prisma.$executeRawUnsafe('ALTER TABLE `PurchaseIntent` DROP COLUMN `termsAcceptedAt`, DROP COLUMN `termsVersion`')

    const ledger = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations WHERE migration_name = '20260825190000_launcher_cms_studio'`
    expect(ledger).toHaveLength(1)

    executeRepair()
    await assertContractExists()
    executeRepair()
    await assertContractExists()
  })
})
