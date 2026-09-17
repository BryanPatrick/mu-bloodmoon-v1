---
status: ACTIVE — policy persisted from Bryan's explicit product decision (Phase N, 2026-08-31)
category: decisions
audience: internal (engineering + product + legal)
lastVerified: 2026-08-31
---

# ADR-0016: RMT policy — no official Blood Moon marketplace; RMT between players is allowed, unmediated

**DATE OF THIS RECORD**: 2026-08-31 (Phase N) — **the underlying product decision predates this record**; the repository simply did not have it written down until now (see "Historical note" below, preserved per this project's standing rule).
**STATUS**: ACTIVE, authoritative

## PHASE N RESOLUTION (authoritative policy, persisted 2026-08-31)

**There is NO official Blood Moon RMT marketplace or classified market.**
Blood Moon does not build, host, or operate a platform for players to
list real-money trades.

**RMT between players is allowed.** Players may privately negotiate and
conduct real-money trades of characters, items, or in-game currency
outside Blood Moon's own systems. Blood Moon does not prohibit this.

**Blood Moon is explicitly NOT a financial intermediary for these
trades.** It does not:

- act as financial intermediary between two players' private RMT deal
- provide escrow
- custody player-to-player fiat payment
- guarantee the outcome of external/private negotiations
- mediate every private dispute as a financial institution would

**Never describe this as "Blood Moon guarantees the trade."** That
framing is explicitly false and must not appear in any player-facing
copy, support documentation, or admin guidance.

### Traceable vs. non-traceable transactions

Transactions that leave **reliable server-side traces** may be
investigated by Blood Moon (e.g. for fraud, exploit abuse, or a genuine
dispute where evidence exists): WC, HP, GP, Zen, jewels, the internal
Market, and any other server-recorded economic flow. These are
investigable *because the evidence already exists on Blood Moon's own
systems* — this is not a special RMT-dispute service, it's the same
evidence Blood Moon already has for any other server-side event.

**Private/manual exchanges without reliable transactional evidence
cannot receive the same guarantee.** If two players privately agree to a
real-money trade entirely outside Blood Moon's systems (e.g. a
direct bank transfer with no corresponding server-side record), Blood
Moon has no reliable evidence to investigate a dispute — this is a
structural limitation, not a policy choice to withhold help.

### Character and account sales

**Character sale: allowed.** Current product direction.

**Account sale: allowed direction, but NOT a finished protected
product.** Do not advertise or represent account sale as a finished,
operationally/legally/security-safeguarded product — the safeguards
below are not yet designed:

**`NEEDS_SECURITY_PRODUCT_DESIGN`** for account sales, specifically:

- recovery ownership (who can recover the account after a sale — the
  original registrant's identity is still on file)
- email transfer (does the account's registered email change hands, and
  how is that verified)
- 2FA (transfer/reset process when 2FA was set up by the seller)
- payment history (whose purchase history does a sold account's
  financial record represent going forward)
- chargeback (liability if a chargeback occurs after an account with
  paid history changes hands)
- reputation (does an account's standing/history transfer with it)
- Beta rewards (interaction with ADR-0004/ADR-0005's email-anchored
  entitlement system — a sold account's Beta-earned entitlements raise
  the same "who does this belong to now" question)
- sanctions (does a ban/sanction history follow the account through a
  sale)
- identity/security retention (interaction with ADR-0007's retention
  categories for the account's accumulated security/identity data)

Until these are designed, account sale remains a real product
*direction*, not a shippable feature with defined guarantees.

## Historical note (preserved, not deleted)

This ADR originally (Phase M, 2026-08-31) recorded that the RMT policy's
*existence* was referenced by two meta-documents in this repo, but its
actual *content* could not be located anywhere after a real search —
correctly declining to invent a policy rather than guess. That finding
was accurate as far as **repository documentation** went: **the policy
was previously missing from persisted project knowledge**, even though
Bryan had already made the underlying product decision. Phase N restored
it — the policy above is **persisted from Bryan's explicit product
decision**, not reconstructed or inferred from any newly-found document.
The original investigation record is preserved below for the historical
record of what was searched and not found, per this project's "never
silently overwrite history" rule.

## CONTEXT (Phase M, original)

Two meta/index documents in this repo both assert that a Real Money
Trading (RMT) policy decision already exists:

> "decisões arquiteturais mais antigas (política de RMT, taxa de sink do
> WCoin, ciclo de vida de conta no Open Beta, política de revisão do
> X-Shop, e outras) continuam documentadas apenas nos seus docs de
> domínio" — `docs/README.md:112-114`

> "many earlier decisions (Open Beta account lifecycle, X-Shop review
> policy, guild/RMT policy, WCoin sink rates, and others) predate this
> log and are documented in their own domain docs" —
> `docs/decisions/README.md:17-20`

Both were written before this Phase M research pass and both cite an RMT
decision's *existence* without pointing at its actual content.

## WHAT WAS SEARCHED, AND NOT FOUND

A dedicated research pass (Phase M, 2026-08-31) searched
`docs/economy/`, `docs/product/`, `docs/store.md`, `docs/marketplace.md`,
`docs/handoff/beta-commerce-strategy.md`,
`docs/handoff/commercial-experience-phase-1.md`,
`docs/catalogs/commerce-item-catalog.md`, and grepped the entire `docs/`
tree for RMT / "real money" / "proibido" / "account selling" /
"gold selling" phrasing. **The actual policy text — what it says, e.g.
whether there is or isn't an official RMT marketplace, what's
prohibited, what enforcement exists — was not found anywhere in the
current repo.**

~~## DECISION (Phase M, original)

None recorded here. Per this project's explicit, standing rule ("Do NOT
invent decisions... mark UNKNOWN if unresolved" —
docs/protocols/agent-bootstrap.md, CLAUDE.md), this ADR does not guess
at what the RMT policy says. Writing a plausible-sounding RMT policy
here would be worse than leaving it explicitly open — it would look
authoritative and could be mistakenly trusted by a future session or a
compliance/legal review.

## WHY THIS ADR EXISTS ANYWAY (Phase M, original)

Documenting the gap explicitly — "a decision is referenced but its
content cannot currently be located" — is itself valuable: it prevents
a future session from either (a) assuming the policy exists somewhere
and not looking hard enough, or (b) inventing one from scratch without
realizing a real decision may already exist somewhere not yet found
(e.g. in an external source, in a conversation with Bryan not yet
written down, or in a document that existed but was lost — matching the
same pattern found in ADR-0008's missing ECONOMY_PRODUCT_DECISIONS.md
and ADR-0012's missing Phase 12 source).

## NEXT STEP (Phase M, original)

This is a real open question, tracked in docs/open-questions.md. It
should be resolved one of two ways: (1) the actual source document is
found (search a broader set of locations, including outside this repo —
e.g. the Knowledge Hub, per docs/knowledge/knowledge-hub-boundary.md, or
ask Bryan directly), and this ADR is updated in place with the real
content once located; or (2) Bryan confirms no such decision was ever
formally made, and this ADR is updated to record that a policy needs to
be decided, not just found.~~

**RESOLVED, Phase N (2026-08-31)**: Option (2)'s path was followed —
Bryan himself supplied the authoritative policy directly (see "PHASE N
RESOLUTION" at the top of this document), rather than an older source
document being found. `docs/open-questions.md` OQ-005 is now closed.

## WHY (the policy's own rationale, Phase N)

No official RMT marketplace keeps Blood Moon out of the business of
being a real-money trading platform — a materially different (and more
legally exposed) business than operating a game server. Allowing RMT
between players without prohibiting it, while explicitly disclaiming any
intermediary/escrow/guarantee role, draws a clean line: Blood Moon
remains responsible for what happens on its own systems (and can
investigate what those systems can prove), and is not responsible for
private arrangements it has no visibility into. The character/account
sale split reflects a real, current gap: character sale is
operationally simple (no persistent identity/security surface tied to a
character), while account sale inherits an account's entire identity/
security/financial history — which is genuinely more design work, not
yet done, and honestly labeled as such rather than either blocked
entirely or shipped without the necessary safeguards.

## ALTERNATIVES CONSIDERED

- **Build an official Blood Moon RMT marketplace**: rejected — a
  fundamentally different business (real-money trading platform) with
  materially different legal/financial exposure than operating a game
  server; not pursued.
- **Prohibit RMT between players entirely**: rejected — unenforceable in
  practice for a private game server (impossible to reliably detect
  every private trade), and prohibiting something unenforceable tends to
  just push it further out of sight rather than actually preventing it.
- **Guarantee/mediate all RMT disputes as a customer-service matter**:
  rejected — Blood Moon has no reliable evidence for disputes over
  transactions that never touched its own systems; promising to mediate
  those would be a promise it cannot reliably keep.
- **Ship account sale as a full feature now**: rejected — the
  recovery/2FA/chargeback/Beta-reward/sanctions safeguards are real,
  unresolved design questions; shipping without them first would create
  real security and dispute risk.

## CONSEQUENCES

- Any player-facing copy, support macro, or admin guidance describing
  RMT must never say "Blood Moon guarantees the trade" — this is a hard
  constraint, not a style preference.
- Support/moderation tooling that investigates a reported RMT dispute
  should distinguish traceable (server-recorded) evidence from
  non-traceable (private/manual) claims, and set expectations
  accordingly — this ADR is the reference for why that distinction
  exists.
- Account sale must not be marketed, documented, or built as a "safe,
  supported" product until the nine `NEEDS_SECURITY_PRODUCT_DESIGN`
  items above have real answers. Character sale has no such blocker.
- Character sale and account-sale-direction do not require any Payment-
  architecture change on their own — see
  `docs/payments/payment-readiness-contract.md`'s scope note on this.

## RELATED SYSTEMS

`docs/README.md`, `docs/decisions/README.md`, `docs/open-questions.md`,
`docs/decisions/0004-open-beta-account-lifecycle.md`,
`docs/decisions/0005-beta-reward-entitlement-preservation.md`,
`docs/decisions/0007-data-retention-current-stance.md`,
ADR-0008 (a related pattern: a cited-but-missing source document).
