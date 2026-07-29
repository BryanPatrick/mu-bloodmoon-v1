import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

if (process.env.NODE_ENV === 'production') {
  throw new Error('Test account seed is disabled in production')
}

const password = process.env.TEST_ACCOUNT_PASSWORD
const personalId = process.env.TEST_ACCOUNT_PERSONAL_ID

if (!password || password.length < 8) {
  throw new Error('Define TEST_ACCOUNT_PASSWORD with at least 8 characters')
}

if (!personalId || personalId.length < 4) {
  throw new Error('Define TEST_ACCOUNT_PERSONAL_ID with at least 4 characters')
}

const prisma = new PrismaClient()
const passwordHash = await bcrypt.hash(password, 12)
const personalIdHash = await bcrypt.hash(personalId, 12)
const testAdminPermissions = [
  'admin.dashboard.view',
  'admin.accounts.view',
  'admin.accounts.status.manage',
  'admin.content.manage',
  'admin.audit.view',
  'admin.audit.history.view',
  'admin.work-logs.view',
  'admin.work-logs.manage',
  'admin.operational-logs.view',
  'admin.errors.view',
  'admin.errors.manage',
  'admin.alerts.view',
  'admin.alerts.manage',
  'admin.logs.export',
  'admin.shop.manage',
  'admin.store.view',
  'admin.store.categories',
  'admin.store.products',
  'admin.store.review',
  'admin.store.publish',
  'admin.store.orders',
  'admin.store.refund',
  'admin.store.deliveries',
  'admin.store.test',
  'admin.orders.operate',
  'admin.marketplace.manage',
  'admin.roadmap.view',
  'admin.roadmap.create',
  'admin.roadmap.edit',
  'admin.roadmap.review',
  'admin.roadmap.approve',
  'admin.roadmap.publish',
  'admin.roadmap.delete'
]

const fixtures = [
  { username: 'player_teste', name: 'Player Teste', email: 'player@teste.local', role: 'PLAYER' },
  { username: 'adm_teste', name: 'ADM Teste', email: 'adm@teste.local', role: 'ADMIN' },
  { username: 'superadm_teste', name: 'Super ADM Teste', email: 'superadm@teste.local', role: 'SUPER_ADMIN' }
]

try {
  for (const fixture of fixtures) {
    const existing = await prisma.account.findFirst({
      where: { OR: [{ username: fixture.username }, { email: fixture.email }] }
    })

    const account = existing
      ? await prisma.account.update({
          where: { id: existing.id },
          data: {
            ...fixture,
            passwordHash,
            personalIdHash,
            status: 'ACTIVE',
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorPending: null,
            sessionVersion: { increment: 1 }
          }
        })
      : await prisma.account.create({
          data: {
            ...fixture,
            passwordHash,
            personalIdHash,
            status: 'ACTIVE'
          }
        })

    for (const currency of ['WCOIN', 'GOBLIN_POINT', 'HUNT_POINT']) {
      await prisma.accountCurrency.upsert({
        where: { accountId_currency: { accountId: account.id, currency } },
        update: fixture.role === 'PLAYER' ? { balance: currency === 'WCOIN' ? 1250 : currency === 'GOBLIN_POINT' ? 340 : 8750 } : {},
        create: { accountId: account.id, currency, balance: fixture.role === 'PLAYER' ? (currency === 'WCOIN' ? 1250 : currency === 'GOBLIN_POINT' ? 340 : 8750) : 0 }
      })
    }

    await prisma.accountSession.updateMany({
      where: { accountId: account.id, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: 'Fixture de teste reiniciada' }
    })

    if (fixture.role === 'ADMIN') {
      for (const key of testAdminPermissions) {
        await prisma.accountPermission.upsert({
          where: { accountId_key: { accountId: account.id, key } },
          update: { granted: true },
          create: { accountId: account.id, key, granted: true }
        })
      }
    }

    if (fixture.role === 'PLAYER') {
      for (const character of [
        { key: 'test-dark-knight', name: 'KnightTeste', className: 'Dark Knight', level: 400, reset: 12, map: 'Lorencia' },
        { key: 'test-fairy-elf', name: 'ElfTeste', className: 'Fairy Elf', level: 350, reset: 8, map: 'Noria' }
      ]) {
        await prisma.accountCharacter.upsert({ where: { key: character.key }, update: { ...character, accountId: account.id }, create: { ...character, accountId: account.id } })
      }

      const product = await prisma.shopProduct.upsert({
        where: { key: 'development-test-pack' },
        update: {},
        create: { key: 'development-test-pack', name: 'Pacote de teste', short: 'TEST', category: 'Desenvolvimento', description: 'Produto ficticio para validar os fluxos locais.', price: 100, currency: 'WCOIN', status: 'ACTIVE' }
      })
      const existingPurchase = await prisma.purchaseIntent.findFirst({ where: { accountId: account.id, productId: product.id } })
      if (!existingPurchase) await prisma.purchaseIntent.create({ data: { accountId: account.id, productId: product.id, price: product.price, currency: product.currency, status: 'COMPLETED' } })

      const existingListing = await prisma.playerMarketListing.findUnique({ where: { gameItemRef: 'development-test-item' } })
      if (!existingListing) await prisma.playerMarketListing.create({ data: { sellerAccountId: account.id, gameItemRef: 'development-test-item', itemName: 'Arco de teste +9', itemCategory: 'Armas', itemData: { level: 9, environment: 'development' }, price: 250, currency: 'WCOIN', status: 'ACTIVE' } })
    }

    await prisma.auditEvent.create({
      data: {
        actorId: account.id,
        actorUsername: account.username,
        action: 'development.test-account.seeded',
        targetType: 'Account',
        targetId: account.id,
        metadata: { role: account.role, environment: process.env.NODE_ENV || 'development' }
      }
    })
  }

  console.log('Development test accounts seeded')
} finally {
  await prisma.$disconnect()
}
