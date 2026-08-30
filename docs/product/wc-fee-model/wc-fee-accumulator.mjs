// Knowledge/Product Phase 11, Parts A-D -- WC P2P fee (10% economic sink)
// reference implementation. Pure, dependency-free, integer-only (no
// floating point anywhere). This is a DESIGN REFERENCE, not production
// code -- it is not wired into apps/api or any live service this phase.
//
// Core problem this solves: AccountCurrency.balance in the real schema
// (apps/api/prisma/schema.prisma) is a plain integer, whole-WC only. A
// 10% fee on a 1 WC sale is 0.1 WC, which cannot be deducted directly
// from a whole-WC balance. This module tracks the fractional shortfall
// per account in an internal fixed-point accumulator (subunits) and only
// performs a real whole-WC balance deduction once the accumulator has
// accrued a full WC of obligation -- exactly the model described in the
// phase spec ("sale 10: cumulative fee obligation reaches 1.0 WC -> one
// whole WC can then be collected").
//
// Scope decision (flagged UNDECIDED in ECONOMY_PRODUCT_DECISIONS.md):
// the accumulator is scoped PER ACCOUNT, and belongs to the RECEIVING
// account (the seller/receiver of taxable WC) -- this matches the
// spec's stated default expectation. A per-seller or per-wallet scope
// would only differ from per-account if an account can hold multiple
// wallets/sellers, which is not the case in the current schema
// (AccountCurrency is unique on [accountId, currency]).

export const SUBUNITS_PER_WC = 10_000
// 10% expressed as an integer numerator/denominator pair -- never as a
// float multiplier. feeSubunits = grossWc * SUBUNITS_PER_WC * FEE_NUM / FEE_DEN
export const FEE_NUM = 10
export const FEE_DEN = 100

// Part C -- transaction taxonomy. Only these types ever accrue P2P fee.
export const TAXABLE_TYPES = new Set([
  'PLAYER_SHOP_PURCHASE',
  'PLAYER_DIRECT_WC_TRANSFER',
  'PLAYER_MARKET_TRANSACTION',
  'OTHER_PLAYER_TO_PLAYER_WC_FLOW'
])

// Non-taxable: server-originated or corrective mutations. Never taxed,
// regardless of amount or direction.
export const NON_TAXABLE_TYPES = new Set([
  'SERVER_REWARD',
  'BUG_HUNTER_REWARD',
  'ADMIN_CORRECTION',
  'WC_PURCHASE_CREDIT',
  'PAYMENT_REFUND_ADJUSTMENT',
  'SYSTEM_COMPENSATION'
])

export const DIRECT_TRANSFER_MINIMUM_WC = 20

export class WcFeeError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

export function createLedgerState() {
  return {
    accounts: new Map(), // accountId -> { balanceWc: int, feeAccumulatorSubunits: int }
    ledger: [], // append-only array of ledger entries, oldest first
    idempotencyIndex: new Map() // idempotencyKey -> ledger entry (for replay)
  }
}

function getAccount(state, accountId) {
  if (!accountId) return null
  if (!state.accounts.has(accountId)) {
    state.accounts.set(accountId, { balanceWc: 0, feeAccumulatorSubunits: 0 })
  }
  return state.accounts.get(accountId)
}

export function getBalance(state, accountId) {
  return getAccount(state, accountId).balanceWc
}

export function getFeeAccumulator(state, accountId) {
  return getAccount(state, accountId).feeAccumulatorSubunits
}

function assertWholeWc(amount, label) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new WcFeeError('INVALID_AMOUNT', `${label} must be a positive whole number of WC, got ${amount}`)
  }
}

// Credits a mint/refund/reward directly -- never taxed. `accountId` is
// the recipient.
function creditNonTaxable(state, accountId, amount) {
  const acct = getAccount(state, accountId)
  acct.balanceWc += amount
}

// Debits without tax -- used for ADMIN_CORRECTION / refund clawback
// paths where the caller has already validated the amount is owed.
function debitNonTaxable(state, accountId, amount) {
  const acct = getAccount(state, accountId)
  if (acct.balanceWc < amount) {
    throw new WcFeeError('INSUFFICIENT_BALANCE', `account ${accountId} has ${acct.balanceWc} WC, cannot debit ${amount}`)
  }
  acct.balanceWc -= amount
}

// Attempts to collect whole WC from the accumulator against the
// account's CURRENT balance. Never drives the balance negative -- if
// the account can't cover the full collectible amount, collects what it
// can and leaves the rest in the accumulator for the next attempt. This
// is what guarantees PLAYER_SHOP_PRICE_1_WC_ALLOWED and the
// no-negative-balance invariant hold even under adversarial draining
// (spend everything immediately after a small sale, before tax catches
// up) -- correctness converges over time rather than blocking in the
// moment.
function settleAccumulator(state, accountId) {
  const acct = getAccount(state, accountId)
  const collectibleWc = Math.floor(acct.feeAccumulatorSubunits / SUBUNITS_PER_WC)
  if (collectibleWc <= 0) return { collectedWc: 0 }
  const actuallyCollectedWc = Math.min(collectibleWc, acct.balanceWc)
  acct.balanceWc -= actuallyCollectedWc
  acct.feeAccumulatorSubunits -= actuallyCollectedWc * SUBUNITS_PER_WC
  return { collectedWc: actuallyCollectedWc }
}

/**
 * Apply one economic transaction to the ledger. Idempotent on
 * `idempotencyKey` -- a retry with the same key returns the original
 * result without mutating state again (Part AH:
 * NO_DUPLICATE_FEE_ON_IDEMPOTENT_RETRY).
 *
 * @param {object} state - from createLedgerState()
 * @param {object} input
 * @param {string} input.idempotencyKey
 * @param {string} input.type - one of TAXABLE_TYPES | NON_TAXABLE_TYPES
 * @param {string|null} input.fromAccountId - payer/source, or null for a pure mint (SERVER_REWARD etc.)
 * @param {string|null} input.toAccountId - payee/destination, or null for a pure debit (e.g. a penalty)
 * @param {number} input.grossWc - whole WC, must be a positive integer
 * @param {string} [input.timestamp]
 * @returns {object} ledger entry
 */
export function applyTransaction(state, input) {
  const { idempotencyKey, type, fromAccountId = null, toAccountId = null, grossWc, timestamp = new Date().toISOString() } = input

  if (!idempotencyKey) throw new WcFeeError('MISSING_IDEMPOTENCY_KEY', 'idempotencyKey is required')
  if (state.idempotencyIndex.has(idempotencyKey)) {
    // Replay: return the exact same entry, no state mutation.
    return state.idempotencyIndex.get(idempotencyKey)
  }

  const isTaxable = TAXABLE_TYPES.has(type)
  const isNonTaxable = NON_TAXABLE_TYPES.has(type)
  if (!isTaxable && !isNonTaxable) {
    throw new WcFeeError('UNKNOWN_TRANSACTION_TYPE', `'${type}' is not a recognized taxable or non-taxable type`)
  }

  assertWholeWc(grossWc, 'grossWc')

  if (type === 'PLAYER_DIRECT_WC_TRANSFER' && grossWc < DIRECT_TRANSFER_MINIMUM_WC) {
    throw new WcFeeError(
      'BELOW_DIRECT_TRANSFER_MINIMUM',
      `direct WC transfer of ${grossWc} is below the ${DIRECT_TRANSFER_MINIMUM_WC} WC minimum -- this does NOT apply to shop/market purchases`
    )
  }

  let entry

  if (!isTaxable) {
    // Non-taxable: plain mint/debit, no fee, no accumulator interaction.
    if (fromAccountId) debitNonTaxable(state, fromAccountId, grossWc)
    if (toAccountId) creditNonTaxable(state, toAccountId, grossWc)
    entry = {
      idempotencyKey,
      type,
      fromAccountId,
      toAccountId,
      grossWc,
      feeAmountWholeWc: 0,
      feeAccumulatorSubunitsBefore: toAccountId ? getFeeAccumulator(state, toAccountId) : null,
      feeAccumulatorSubunitsAfter: toAccountId ? getFeeAccumulator(state, toAccountId) : null,
      netWc: grossWc,
      timestamp,
      status: 'SETTLED'
    }
  } else {
    if (!fromAccountId || !toAccountId) {
      throw new WcFeeError('MISSING_PARTIES', `taxable transaction type '${type}' requires both fromAccountId and toAccountId`)
    }

    // Buyer pays the full gross amount up front (matches the real
    // marketplace.service.ts behavior: debitCurrency(buyer, listing.price)).
    debitNonTaxable(state, fromAccountId, grossWc)

    // Exact fee in subunits -- always an exact integer for a whole-WC
    // gross amount (grossWc * 10,000 * 10 / 100 = grossWc * 1,000, no
    // remainder possible), so there is no rounding decision to make
    // here at all. The rounding problem lives entirely in *realizing*
    // this exact subunit fee against a whole-WC balance column, which
    // settleAccumulator() below handles.
    const feeSubunitsExact = (grossWc * SUBUNITS_PER_WC * FEE_NUM) / FEE_DEN

    const seller = getAccount(state, toAccountId)
    const accumulatorBefore = seller.feeAccumulatorSubunits

    // Seller receives the full gross amount now (can't fractionally
    // withhold on a whole-WC balance) -- their fee obligation instead
    // accrues into the accumulator and is settled separately.
    creditNonTaxable(state, toAccountId, grossWc)
    seller.feeAccumulatorSubunits += feeSubunitsExact

    const { collectedWc } = settleAccumulator(state, toAccountId)

    entry = {
      idempotencyKey,
      type,
      fromAccountId,
      toAccountId,
      grossWc,
      feeObligationSubunitsThisTx: feeSubunitsExact,
      feeAmountWholeWcCollected: collectedWc,
      feeAccumulatorSubunitsBefore: accumulatorBefore,
      feeAccumulatorSubunitsAfter: seller.feeAccumulatorSubunits,
      netWc: grossWc, // seller's immediate credit; the fee catches up via the accumulator, not by reducing this
      timestamp,
      status: 'SETTLED'
    }
  }

  state.ledger.push(entry)
  state.idempotencyIndex.set(idempotencyKey, entry)
  return entry
}

/**
 * Sums exact fee obligation accrued (in subunits) for an account across
 * the whole ledger, independent of how much has actually been
 * collected yet. Used by tests to assert the EXACT 10% invariant holds
 * over a sequence, even while some fraction remains uncollected in the
 * accumulator.
 */
export function totalFeeObligationSubunits(state, accountId) {
  return state.ledger
    .filter((e) => e.toAccountId === accountId && e.type !== undefined && TAXABLE_TYPES.has(e.type))
    .reduce((sum, e) => sum + (e.feeObligationSubunitsThisTx || 0), 0)
}

export function totalGrossReceivedWc(state, accountId) {
  return state.ledger
    .filter((e) => e.toAccountId === accountId && TAXABLE_TYPES.has(e.type))
    .reduce((sum, e) => sum + e.grossWc, 0)
}
