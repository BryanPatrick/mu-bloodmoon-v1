import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Phase 15 -- self-service account deletion request/confirm/cancel/export
// flow. Mirrors password-recovery.e2e-spec.ts's mail-bypass + token
// extraction pattern exactly (AUTH_MAIL_TEST_BYPASS, consumeLastSentForTest,
// regex token extraction) since this flow was built on the same primitive.
const CONTAINER = 'bloodmoon-e2e-account-deletion-request'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
  process.env.AUTH_MAIL_TEST_BYPASS = '1'
  process.env.WEB_PUBLIC_URL = 'https://e2e.bloodmoon.invalid'
  process.env.ACCOUNT_DELETION_GRACE_PERIOD_DAYS = '14'
  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => stopDisposableDatabase(CONTAINER))

jest.setTimeout(30000)

describe('Account deletion request flow -- Phase 15', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let deletionRequest: import('../src/modules/accounts/account-deletion-request.service').AccountDeletionRequestService
  let mailTransport: import('../src/modules/auth/mail-transport.service').MailTransportService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { AccountDeletionRequestService } = await import('../src/modules/accounts/account-deletion-request.service')
    const { MailTransportService } = await import('../src/modules/auth/mail-transport.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    deletionRequest = app.get(AccountDeletionRequestService)
    mailTransport = app.get(MailTransportService)
  }, 60000)

  afterAll(async () => app?.close())

  const suffix = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

  async function makeAccount(label: string) {
    const s = suffix()
    return prisma.account.create({
      data: {
        username: `${label}_${s}`,
        name: `${label} ${s}`,
        email: `${label}-${s}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: 'PLAYER',
        status: 'ACTIVE'
      }
    })
  }

  function asUser(account: { id: string, username: string, email: string }) {
    return { ...account, name: account.username, role: 'PLAYER' as const, permissions: [], twoFactorEnabled: false }
  }

  const extractToken = (text: string) => {
    const match = text.match(/token=([a-f0-9]+)/)
    if (!match) throw new Error('deletion confirmation token not found in captured email')
    return match[1]
  }

  test('REQUEST_SENDS_CONFIRMATION_EMAIL_WITH_TOKEN', async () => {
    const account = await makeAccount('delreq')
    const result = await deletionRequest.requestDeletion(asUser(account), { ip: '127.0.0.1', device: 'jest' })
    expect(result.status).toBe('REQUESTED')

    const sent = mailTransport.consumeLastSentForTest()
    expect(sent?.to).toBe(account.email)
    expect(sent?.text).toContain('https://e2e.bloodmoon.invalid/conta/confirmar-exclusao?token=')

    const row = await prisma.accountDeletionRequest.findUnique({ where: { accountId: account.id } })
    expect(row?.status).toBe('REQUESTED')
  })

  test('CONFIRM_SCHEDULES_EXECUTION_AFTER_GRACE_PERIOD', async () => {
    const account = await makeAccount('delconfirm')
    await deletionRequest.requestDeletion(asUser(account), { ip: null, device: null })
    const token = extractToken(mailTransport.consumeLastSentForTest()!.text)

    const result = await deletionRequest.confirmDeletion(token, { ip: null, device: null })
    expect(result.status).toBe('CONFIRMED')

    const row = await prisma.accountDeletionRequest.findUnique({ where: { accountId: account.id } })
    expect(row?.status).toBe('CONFIRMED')
    expect(row?.scheduledExecutionAt).not.toBeNull()
    // Roughly 14 days out (grace period), not immediate.
    const daysOut = (row!.scheduledExecutionAt!.getTime() - Date.now()) / 86_400_000
    expect(daysOut).toBeGreaterThan(13)
    expect(daysOut).toBeLessThan(15)
  })

  test('CONFIRM_WITH_INVALID_TOKEN_REJECTED', async () => {
    await expect(deletionRequest.confirmDeletion('not-a-real-token', { ip: null, device: null })).rejects.toThrow()
  })

  test('CONFIRM_TOKEN_IS_SINGLE_USE', async () => {
    const account = await makeAccount('delsingleuse')
    await deletionRequest.requestDeletion(asUser(account), { ip: null, device: null })
    const token = extractToken(mailTransport.consumeLastSentForTest()!.text)

    await deletionRequest.confirmDeletion(token, { ip: null, device: null })
    await expect(deletionRequest.confirmDeletion(token, { ip: null, device: null })).rejects.toThrow()
  })

  test('CANCEL_STOPS_A_PENDING_REQUEST', async () => {
    const account = await makeAccount('delcancel')
    await deletionRequest.requestDeletion(asUser(account), { ip: null, device: null })

    const result = await deletionRequest.cancelDeletion(asUser(account))
    expect(result.status).toBe('CANCELLED')

    const row = await prisma.accountDeletionRequest.findUnique({ where: { accountId: account.id } })
    expect(row?.status).toBe('CANCELLED')
  })

  test('CANCEL_AFTER_CONFIRM_ALSO_STOPS_EXECUTION', async () => {
    const account = await makeAccount('delcancelconfirmed')
    await deletionRequest.requestDeletion(asUser(account), { ip: null, device: null })
    const token = extractToken(mailTransport.consumeLastSentForTest()!.text)
    await deletionRequest.confirmDeletion(token, { ip: null, device: null })

    await deletionRequest.cancelDeletion(asUser(account))
    const row = await prisma.accountDeletionRequest.findUnique({ where: { accountId: account.id } })
    expect(row?.status).toBe('CANCELLED')
  })

  test('STATUS_REFLECTS_CURRENT_STATE', async () => {
    const account = await makeAccount('delstatus')
    expect((await deletionRequest.myDeletionStatus(asUser(account))).status).toBe('NONE')

    await deletionRequest.requestDeletion(asUser(account), { ip: null, device: null })
    expect((await deletionRequest.myDeletionStatus(asUser(account))).status).toBe('REQUESTED')
  })

  test('EXPORT_NEVER_INCLUDES_PASSWORD_HASH_OR_INTERNAL_FIELDS', async () => {
    const account = await makeAccount('delexport')
    const data = await deletionRequest.exportMyData(asUser(account))
    const serialized = JSON.stringify(data)
    expect(serialized).not.toContain('not-a-real-hash')
    expect(data.account.email).toBe(account.email)
    expect(data).not.toHaveProperty('passwordHash')
  })

  test('PROCESS_READY_DELETIONS_ONLY_EXECUTES_PAST_GRACE_PERIOD', async () => {
    const notReady = await makeAccount('delnotready')
    await deletionRequest.requestDeletion(asUser(notReady), { ip: null, device: null })
    const notReadyToken = extractToken(mailTransport.consumeLastSentForTest()!.text)
    await deletionRequest.confirmDeletion(notReadyToken, { ip: null, device: null })

    const ready = await makeAccount('delready')
    await deletionRequest.requestDeletion(asUser(ready), { ip: null, device: null })
    const readyToken = extractToken(mailTransport.consumeLastSentForTest()!.text)
    await deletionRequest.confirmDeletion(readyToken, { ip: null, device: null })
    // Force this one's grace period into the past.
    await prisma.accountDeletionRequest.update({
      where: { accountId: ready.id },
      data: { scheduledExecutionAt: new Date(Date.now() - 1000) }
    })

    const result = await deletionRequest.processReadyDeletions()
    expect(result.executed).toBeGreaterThanOrEqual(1)

    const readyRow = await prisma.accountDeletionRequest.findUnique({ where: { accountId: ready.id } })
    expect(readyRow?.status).toBe('EXECUTED')
    const notReadyRow = await prisma.accountDeletionRequest.findUnique({ where: { accountId: notReady.id } })
    expect(notReadyRow?.status).toBe('CONFIRMED')

    const deletedAccount = await prisma.account.findUnique({ where: { id: ready.id } })
    expect(deletedAccount?.username).toBe(`deleted-${ready.id}`)
  })

  test('PROCESS_READY_DELETIONS_SKIPS_NEWLY_BLOCKED_ACCOUNT_NOT_SILENTLY_FORCED', async () => {
    const account = await makeAccount('delblockedatexec')
    await deletionRequest.requestDeletion(asUser(account), { ip: null, device: null })
    const token = extractToken(mailTransport.consumeLastSentForTest()!.text)
    await deletionRequest.confirmDeletion(token, { ip: null, device: null })
    await prisma.accountDeletionRequest.update({
      where: { accountId: account.id },
      data: { scheduledExecutionAt: new Date(Date.now() - 1000) }
    })
    // Promoted to staff between confirmation and execution -- must block.
    await prisma.account.update({ where: { id: account.id }, data: { role: 'GM' } })

    const result = await deletionRequest.processReadyDeletions()
    expect(result.blocked).toBeGreaterThanOrEqual(1)

    const row = await prisma.accountDeletionRequest.findUnique({ where: { accountId: account.id } })
    expect(row?.status).toBe('CONFIRMED')
    const stillThere = await prisma.account.findUnique({ where: { id: account.id } })
    expect(stillThere?.username).toBe(account.username)
  })
})
