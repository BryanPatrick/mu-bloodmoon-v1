import { parseBrlPrice, seedRechargePackages, wcoinBaseForBrl } from '../src/modules/commerce/commerce.service'

// PHASE N (2026-08-31): deterministic proof of Blood Moon's authoritative
// commercial peg (docs/decisions/0008-wcoin-1to1-peg-with-brl.md):
// 1 WC = R$1,00, always, never package-dependent. This file exists
// specifically because a real conflict was found and fixed this phase --
// the previous seed data sold 500 WC for R$19,90 (~25x off the peg).
//
// Deliberately DB-free: an earlier version of this file seeded/queried
// the real RechargePackage table, but the local dev database is shared
// across e2e spec files and sessions and already had real leftover rows
// (some with RechargeIntent foreign-key references, making blind cleanup
// unsafe) from unrelated prior test runs -- confirmed during this
// phase's own investigation. Testing the exported seedRechargePackages
// constant directly proves the same invariant (the seed DATA is correct)
// without any dependency on the table's ambient state; ensureSeeded()'s
// own DB-insertion mechanism is pre-existing, unrelated plumbing this
// phase didn't change and doesn't need to re-prove.
describe('WCoin 1:1 R$ peg -- pure conversion function', () => {
  it.each([
    ['1,00', 1],
    ['10,00', 10],
    ['20,00', 20],
    ['50,00', 50],
    ['100,00', 100]
  ])('R$%s -> %i WC (base rate, no bonus)', (priceBrl, expectedWc) => {
    expect(wcoinBaseForBrl(priceBrl)).toBe(expectedWc)
  })

  it('parses the Brazilian currency format (dot = thousands separator, comma = decimal) -- NOT interchangeable with a plain dot-decimal string', () => {
    // Real behavior confirmed by reading parseBrlPrice's own implementation
    // and by a real leftover test-fixture row found in the local dev DB
    // during this phase's investigation (price stored as "10.00" instead
    // of "10,00"): parseBrlPrice treats "." as a thousands separator it
    // strips, so "50.00" parses as 5000, not 50. RechargePackage.price is
    // ALWAYS stored in Brazilian format ("39,90") elsewhere in this
    // codebase -- this test documents the real parsing rule so a future
    // change doesn't assume the two formats are interchangeable.
    expect(parseBrlPrice('50,00')).toBe(50)
    expect(parseBrlPrice('50.00')).toBe(5000)
    expect(wcoinBaseForBrl('50,00')).toBe(50)
  })

  it('never derives a bonus from the base conversion -- bonus is always a separate, explicit value', () => {
    // wcoinBaseForBrl has no bonus concept at all -- this test exists to
    // make that a visible, permanent property, not an implicit omission.
    expect(wcoinBaseForBrl).toHaveLength(1)
  })
})

describe('WCoin 1:1 R$ peg -- the real seed data constant', () => {
  const wcoinPackages = seedRechargePackages.filter((p) => p.currency === 'WCOIN')
  const nonWcoinPackages = seedRechargePackages.filter((p) => p.currency !== 'WCOIN')

  it('has at least one WCOIN package', () => {
    expect(wcoinPackages.length).toBeGreaterThan(0)
  })

  it.each(wcoinPackages.map((p) => [p.key, p]))('%s: amount is exactly wcoinBaseForBrl(price)', (_key, pack) => {
    expect(pack.amount).toBe(wcoinBaseForBrl(pack.price))
  })

  it('carries exactly one explicit promotion -- Bryan\'s own example, R$50 -> base 50 WC + bonus 5 WC = 55 delivered', () => {
    const found = wcoinPackages.find((p) => parseBrlPrice(p.price) === 50)
    expect(found).toBeDefined()
    const fiftyReais = found as NonNullable<typeof found>
    const bonus = fiftyReais.bonus ?? 0
    expect(fiftyReais.amount).toBe(50)
    expect(bonus).toBe(5)
    expect(fiftyReais.amount + bonus).toBe(55)
  })

  it('every other WCOIN package carries zero bonus -- no bonus tier is invented beyond the one authorized example', () => {
    const nonPromoPackages = wcoinPackages.filter((p) => parseBrlPrice(p.price) !== 50)
    expect(nonPromoPackages.length).toBeGreaterThan(0)
    for (const pack of nonPromoPackages) {
      expect(pack.bonus).toBe(0)
    }
  })

  it('leaves GOBLIN_POINT/HUNT_POINT package pricing untouched -- Decision 1 is scoped to WCOIN only', () => {
    expect(nonWcoinPackages.length).toBeGreaterThan(0)
    for (const pack of nonWcoinPackages) {
      // Not asserting specific values -- only that these currencies were
      // not silently forced onto the WC 1:1 rate by this phase's fix.
      expect(pack.amount).not.toBe(wcoinBaseForBrl(pack.price))
    }
  })
})
