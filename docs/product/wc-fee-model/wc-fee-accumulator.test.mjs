#!/usr/bin/env node
// Knowledge/Product Phase 11, Part AH -- deterministic tests for the WC
// P2P fee accumulator (wc-fee-accumulator.mjs). Covers every edge case
// enumerated in Part B plus the 8 explicit invariants in Part AH.
//
// Usage: node docs/product/wc-fee-model/wc-fee-accumulator.test.mjs
import {
  createLedgerState,
  applyTransaction,
  getBalance,
  getFeeAccumulator,
  totalFeeObligationSubunits,
  totalGrossReceivedWc,
  SUBUNITS_PER_WC,
  WcFeeError
} from './wc-fee-accumulator.mjs'

let failures = 0
function check(name, fn) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
  } catch (e) {
    failures++
    console.log(`[FAIL] ${name}: ${e.message}`)
  }
}
function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`)
}
function assertThrows(fn, codeExpected, label) {
  try {
    fn()
    throw new Error(`${label}: expected throw with code ${codeExpected}, nothing thrown`)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith(`${label}:`)) throw e
    if (!(e instanceof WcFeeError) || e.code !== codeExpected) {
      throw new Error(`${label}: expected WcFeeError(${codeExpected}), got ${e.constructor.name}(${e.code || e.message})`)
    }
  }
}

function seedBuyer(state, accountId, wc) {
  applyTransaction(state, { idempotencyKey: `seed-${accountId}`, type: 'SERVER_REWARD', toAccountId: accountId, grossWc: wc })
}

function marketSale(state, key, buyer, seller, priceWc) {
  return applyTransaction(state, {
    idempotencyKey: key,
    type: 'PLAYER_MARKET_TRANSACTION',
    fromAccountId: buyer,
    toAccountId: seller,
    grossWc: priceWc
  })
}

// ---------------------------------------------------------------------
// Part B -- fractional tax edge cases
// ---------------------------------------------------------------------

check('1 WC x 10 transactions -> cumulative fee converges to exactly 1 WC collected', () => {
  const state = createLedgerState()
  seedBuyer(state, 'buyer', 10)
  for (let i = 0; i < 10; i++) marketSale(state, `s1-${i}`, 'buyer', 'seller', 1)
  // 10 sales x 1 WC gross = 10 WC total received; exact 10% = 1.0 WC fee
  assertEqual(totalFeeObligationSubunits(state, 'seller'), 10 * 1000, 'total fee obligation (subunits)')
  assertEqual(getFeeAccumulator(state, 'seller') % SUBUNITS_PER_WC, 0, 'accumulator remainder after exactly 1.0 WC obligation')
  // Seller received 10 WC gross, and by the 10th sale the accumulator
  // crossed a whole WC and 1 WC was actually collected back.
  assertEqual(getBalance(state, 'seller'), 10 - 1, 'seller net balance after full collection')
})

check('2 WC x 5 transactions -> exact 10% (1 WC total fee)', () => {
  const state = createLedgerState()
  seedBuyer(state, 'buyer', 10)
  for (let i = 0; i < 5; i++) marketSale(state, `s2-${i}`, 'buyer', 'seller', 2)
  assertEqual(totalFeeObligationSubunits(state, 'seller'), 5 * 2000, 'total fee obligation (subunits)')
  assertEqual(getBalance(state, 'seller'), 10 - 1, 'seller net balance')
})

check('3 WC repeated (7x = 21 WC gross) -> fee obligation exactly 2.1 WC, 2 WC collected, 0.1 WC still pending', () => {
  const state = createLedgerState()
  seedBuyer(state, 'buyer', 21)
  for (let i = 0; i < 7; i++) marketSale(state, `s3-${i}`, 'buyer', 'seller', 3)
  assertEqual(totalFeeObligationSubunits(state, 'seller'), 7 * 3000, 'total fee obligation (subunits) = 21000 = 2.1 WC')
  assertEqual(getFeeAccumulator(state, 'seller'), 1000, 'pending accumulator remainder = 0.1 WC = 1000 subunits')
  assertEqual(getBalance(state, 'seller'), 21 - 2, 'only 2 whole WC collectible so far')
})

for (const wc of [9, 10, 11, 19, 20, 21, 99, 100, 101]) {
  check(`single ${wc} WC market sale -> fee = exactly floor(${wc}*0.1) collected immediately, remainder held`, () => {
    const state = createLedgerState()
    seedBuyer(state, 'buyer', wc)
    const entry = marketSale(state, `single-${wc}`, 'buyer', 'seller', wc)
    const exactFeeSubunits = wc * 1000
    assertEqual(entry.feeObligationSubunitsThisTx, exactFeeSubunits, 'exact fee obligation this tx (subunits)')
    const expectedCollectedWc = Math.floor(exactFeeSubunits / SUBUNITS_PER_WC)
    assertEqual(entry.feeAmountWholeWcCollected, expectedCollectedWc, 'whole WC collected this tx')
    assertEqual(getBalance(state, 'seller'), wc - expectedCollectedWc, 'seller balance after single sale')
    assertEqual(getFeeAccumulator(state, 'seller'), exactFeeSubunits - expectedCollectedWc * SUBUNITS_PER_WC, 'accumulator remainder')
  })
}

check('mixed sequence [1,7,3,19,100,2,4] -> cumulative fee obligation is exactly 10% of cumulative gross', () => {
  const state = createLedgerState()
  const seq = [1, 7, 3, 19, 100, 2, 4]
  const totalGross = seq.reduce((a, b) => a + b, 0)
  seedBuyer(state, 'buyer', totalGross)
  seq.forEach((wc, i) => marketSale(state, `mix-${i}`, 'buyer', 'seller', wc))
  assertEqual(totalGrossReceivedWc(state, 'seller'), totalGross, 'total gross received')
  assertEqual(totalFeeObligationSubunits(state, 'seller'), totalGross * 1000, 'total fee obligation = exact 10% of gross, in subunits')
})

// ---------------------------------------------------------------------
// Part B -- concurrent / failure / idempotency / balance edge cases
// ---------------------------------------------------------------------

check('failed/rolled-back transaction generates NO tax debt (validation failure is a no-op)', () => {
  const state = createLedgerState()
  seedBuyer(state, 'buyer', 5) // buyer only has 5 WC
  try {
    marketSale(state, 'will-fail', 'buyer', 'seller', 100) // tries to spend 100, insufficient
  } catch {
    // expected -- insufficient balance
  }
  assertEqual(getBalance(state, 'seller'), 0, 'seller balance untouched by failed transaction')
  assertEqual(getFeeAccumulator(state, 'seller'), 0, 'seller accumulator untouched by failed transaction')
  assertEqual(getBalance(state, 'buyer'), 5, 'buyer balance untouched by failed transaction')
})

check('duplicate request / retry with same idempotencyKey does NOT apply fee twice', () => {
  const state = createLedgerState()
  seedBuyer(state, 'buyer', 20)
  const first = marketSale(state, 'dup-key', 'buyer', 'seller', 10)
  const balanceAfterFirst = getBalance(state, 'seller')
  const accumulatorAfterFirst = getFeeAccumulator(state, 'seller')
  const second = marketSale(state, 'dup-key', 'buyer', 'seller', 10) // same key, retried
  assertEqual(second, first, 'retry returns the identical ledger entry object')
  assertEqual(getBalance(state, 'seller'), balanceAfterFirst, 'seller balance unchanged by retry')
  assertEqual(getFeeAccumulator(state, 'seller'), accumulatorAfterFirst, 'accumulator unchanged by retry')
  assertEqual(getBalance(state, 'buyer'), 10, 'buyer only debited once across both calls')
})

check('negative balance prevention: cannot spend more WC than held', () => {
  const state = createLedgerState()
  seedBuyer(state, 'buyer', 5)
  assertThrows(() => marketSale(state, 'overspend', 'buyer', 'seller', 6), 'INSUFFICIENT_BALANCE', 'overspend attempt')
  assertEqual(getBalance(state, 'buyer'), 5, 'buyer balance unchanged after rejected overspend')
})

check('accumulator persistence: state survives across many sequential calls without drift', () => {
  const state = createLedgerState()
  seedBuyer(state, 'buyer', 1000)
  for (let i = 0; i < 100; i++) marketSale(state, `persist-${i}`, 'buyer', 'seller', 1)
  // 100 sales x 1 WC = 100 WC gross, exact 10% = 10 WC fee, all collectible
  assertEqual(totalFeeObligationSubunits(state, 'seller'), 100 * 1000, 'total fee obligation after 100 sales')
  assertEqual(getFeeAccumulator(state, 'seller'), 0, 'accumulator fully settled (100 sales x 0.1 WC = exactly 10 whole WC)')
  assertEqual(getBalance(state, 'seller'), 100 - 10, 'seller net balance after 100 sales')
})

check('processing-order independence: same multiset of sales in a different order converges to the same total fee', () => {
  const seqA = [1, 7, 3, 19, 100, 2, 4]
  const seqB = [100, 4, 19, 1, 2, 7, 3] // reordered
  function run(seq) {
    const state = createLedgerState()
    const total = seq.reduce((a, b) => a + b, 0)
    seedBuyer(state, 'buyer', total)
    seq.forEach((wc, i) => marketSale(state, `order-${i}`, 'buyer', 'seller', wc))
    return totalFeeObligationSubunits(state, 'seller')
  }
  assertEqual(run(seqA), run(seqB), 'total fee obligation independent of transaction order')
})

// ---------------------------------------------------------------------
// Part C -- taxonomy
// ---------------------------------------------------------------------

check('SERVER_REWARD is never taxed regardless of amount', () => {
  const state = createLedgerState()
  applyTransaction(state, { idempotencyKey: 'reward-1', type: 'SERVER_REWARD', toAccountId: 'player', grossWc: 1000 })
  assertEqual(getBalance(state, 'player'), 1000, 'full reward credited')
  assertEqual(getFeeAccumulator(state, 'player'), 0, 'no fee accrued from a server reward')
})

check('BUG_HUNTER_REWARD is never taxed', () => {
  const state = createLedgerState()
  applyTransaction(state, { idempotencyKey: 'bug-1', type: 'BUG_HUNTER_REWARD', toAccountId: 'hunter', grossWc: 40 })
  assertEqual(getBalance(state, 'hunter'), 40, 'full bug bounty credited')
  assertEqual(getFeeAccumulator(state, 'hunter'), 0, 'no fee accrued')
})

check('WC_PURCHASE_CREDIT (real-money recharge) is never taxed', () => {
  const state = createLedgerState()
  applyTransaction(state, { idempotencyKey: 'recharge-1', type: 'WC_PURCHASE_CREDIT', toAccountId: 'buyer', grossWc: 500 })
  assertEqual(getBalance(state, 'buyer'), 500, 'full recharge credited, untaxed')
})

check('an unrecognized transaction type is rejected rather than silently treated as non-taxable', () => {
  const state = createLedgerState()
  assertThrows(
    () => applyTransaction(state, { idempotencyKey: 'bad-type', type: 'SOMETHING_MADE_UP', toAccountId: 'x', grossWc: 5 }),
    'UNKNOWN_TRANSACTION_TYPE',
    'unknown type'
  )
})

// ---------------------------------------------------------------------
// Direct transfer minimum vs. shop/market purchase (Part A: "must not
// block normal purchases")
// ---------------------------------------------------------------------

check('DIRECT_TRANSFER of 19 WC is rejected (below the 20 WC minimum)', () => {
  const state = createLedgerState()
  seedBuyer(state, 'buyer', 19)
  assertThrows(
    () => applyTransaction(state, { idempotencyKey: 'transfer-19', type: 'PLAYER_DIRECT_WC_TRANSFER', fromAccountId: 'buyer', toAccountId: 'friend', grossWc: 19 }),
    'BELOW_DIRECT_TRANSFER_MINIMUM',
    '19 WC direct transfer'
  )
})

check('DIRECT_TRANSFER of 20 WC is allowed', () => {
  const state = createLedgerState()
  seedBuyer(state, 'buyer', 20)
  const entry = applyTransaction(state, { idempotencyKey: 'transfer-20', type: 'PLAYER_DIRECT_WC_TRANSFER', fromAccountId: 'buyer', toAccountId: 'friend', grossWc: 20 })
  assertEqual(entry.status, 'SETTLED', '20 WC direct transfer settles')
  // 20 WC gross x 10% = exactly 2 WC fee -- already a whole-WC amount,
  // so (unlike a 1 WC sale) it is collected in this same transaction
  // rather than waiting in the accumulator.
  assertEqual(getBalance(state, 'friend'), 18, 'friend receives 20 WC gross minus the 2 WC fee, collected immediately since it is already whole')
  assertEqual(getFeeAccumulator(state, 'friend'), 0, 'no remainder -- 20 WC is an exact multiple of 10')
})

check('PLAYER_SHOP_PURCHASE of 1 WC is allowed (the 20 WC minimum does NOT apply to shop purchases)', () => {
  const state = createLedgerState()
  seedBuyer(state, 'buyer', 1)
  const entry = applyTransaction(state, { idempotencyKey: 'shop-1wc', type: 'PLAYER_SHOP_PURCHASE', fromAccountId: 'buyer', toAccountId: 'shopOwner', grossWc: 1 })
  assertEqual(entry.status, 'SETTLED', '1 WC shop purchase settles')
  assertEqual(getBalance(state, 'shopOwner'), 1, 'shop owner receives the full 1 WC gross immediately')
  assertEqual(getFeeAccumulator(state, 'shopOwner'), 1000, '10% of 1 WC = 1000 subunits, none yet collectible as a whole WC')
})

// ---------------------------------------------------------------------
// EXACT_CUMULATIVE_10_PERCENT over a long, varied, randomized-shape run
// ---------------------------------------------------------------------

check('EXACT_CUMULATIVE_10_PERCENT holds over a long varied sequence (no drift)', () => {
  const state = createLedgerState()
  // Deterministic pseudo-random-looking sequence, not Math.random() --
  // keeps the test itself deterministic and reproducible.
  const amounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 17, 20, 21, 33, 50, 77, 99, 100, 123, 250, 999]
  const total = amounts.reduce((a, b) => a + b, 0)
  seedBuyer(state, 'buyer', total)
  amounts.forEach((wc, i) => marketSale(state, `long-${i}`, 'buyer', 'seller', wc))
  const totalObligationSubunits = totalFeeObligationSubunits(state, 'seller')
  assertEqual(totalObligationSubunits, total * 1000, 'exact cumulative fee obligation (10% of gross, in subunits)')
})

console.log('')
if (failures === 0) {
  console.log('All WC fee accumulator checks passed.')
  process.exit(0)
} else {
  console.log(`${failures} check(s) failed.`)
  process.exit(1)
}
