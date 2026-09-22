#!/usr/bin/env node
// Cloudflare migration CF-DB-01 (2026-09-22): proves the real generated Prisma client (the same one
// the API uses) can connect, read, and write against a disposable, restored copy of the database.
//
// Safety: this script never chooses a target -- it only uses whatever DATABASE_URL is already set in
// its environment, and refuses to run at all against anything that looks like production. It writes
// exactly one disposable row (a WalletLedgerEntry using the real unique idempotencyKey constraint),
// proves Prisma's own unique-constraint error path, then deletes that row -- zero residue.
//
//   DATABASE_URL="mysql://user:pass@127.0.0.1:<port>/bloodmoon_restore_test_<name>" \
//     node scripts/verify-disposable-restore-prisma.mjs
import { PrismaClient } from '@prisma/client'

const url = process.env.DATABASE_URL || ''
if (!url) throw new Error('DATABASE_URL is not set')
if (/mubloodxz|production|\.com\.br/i.test(url)) {
	throw new Error('refusing to run against a production-looking DATABASE_URL')
}
if (!/127\.0\.0\.1|localhost/.test(url)) {
	throw new Error('refusing to run against a non-loopback DATABASE_URL')
}

const prisma = new PrismaClient()
const results = {}
const check = (name, ok, detail = '') => {
	results[name] = { ok, detail }
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}

try {
	const accountCount = await prisma.account.count()
	check('connects and reads Account (aggregate count only)', accountCount >= 0, `count=${accountCount}`)

	const ledgerCount = await prisma.walletLedgerEntry.count()
	check('reads WalletLedgerEntry (aggregate count only)', ledgerCount >= 0, `count=${ledgerCount}`)

	const migrationRows = await prisma.$queryRaw`SELECT COUNT(*) AS c FROM _prisma_migrations`
	const migrationCount = Number(migrationRows[0]?.c ?? 0)
	check('reads _prisma_migrations', migrationCount > 0, `count=${migrationCount}`)

	const created = await prisma.walletLedgerEntry.create({
		data: {
			id: 'cfdb01-prisma-write-test',
			idempotencyKey: 'cfdb01-prisma-write-test-key',
			type: 'ADMIN_ADJUSTMENT',
			currency: 'WCOIN',
			grossAmount: 1,
			netAmount: 1,
			status: 'SETTLED'
		}
	})
	check('writes a disposable row through the real Prisma client', created.id === 'cfdb01-prisma-write-test')

	let duplicateRejected = false
	try {
		await prisma.walletLedgerEntry.create({
			data: {
				id: 'cfdb01-prisma-write-test-2',
				idempotencyKey: 'cfdb01-prisma-write-test-key',
				type: 'ADMIN_ADJUSTMENT',
				currency: 'WCOIN',
				grossAmount: 2,
				netAmount: 2,
				status: 'SETTLED'
			}
		})
	} catch (error) {
		duplicateRejected = error.code === 'P2002'
	}
	check('Prisma enforces the real unique idempotencyKey constraint (P2002)', duplicateRejected)

	await prisma.walletLedgerEntry.delete({ where: { id: 'cfdb01-prisma-write-test' } })
	const leftover = await prisma.walletLedgerEntry.count({ where: { idempotencyKey: 'cfdb01-prisma-write-test-key' } })
	check('cleanup left zero residue', leftover === 0)
} finally {
	await prisma.$disconnect()
}

const failed = Object.values(results).filter((r) => !r.ok)
console.log(`\n${Object.keys(results).length - failed.length}/${Object.keys(results).length} checks passed`)
if (failed.length) process.exitCode = 1
