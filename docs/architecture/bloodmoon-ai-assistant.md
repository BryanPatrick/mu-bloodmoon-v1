---
status: DESIGN — conceptual architecture only, nothing implemented
category: architecture
audience: internal (Bryan + any engineering agent)
lastVerified: 2026-09-16
confidence: PROPOSAL — no code, no data pipeline, no model integration exists yet
---

# Blood Moon AI assistant — conceptual architecture

**DATE**: 2026-09-16. **SCOPE**: design only. No assistant exists yet;
nothing here is implemented. Companion to
`docs/architecture/engineering-agent-orchestration.md` (B1-B14, B21-B30)
and `docs/architecture/notification-intelligence.md` (B14, B20). This
document covers B15-B19 of that phase's request.

## B15 — What the assistant should cover

A single conversational surface across: **site** (navigation, account,
support), **game** (progression, builds, events), **support** (ticket
creation, FAQ), **wiki** (search, explain), **account** (permitted
self-data), **marketplace** (listings, wishlist, bids), **events**
(schedule, rules), **progression** (advice, resets, next steps).

Capabilities: answer questions, search the Wiki, explain systems
(economy rules, reset mechanics, VIP tiers), give progression advice,
interpret a player's own permitted account data, notify about events,
track marketplace activity on the player's behalf, explain payments/
currency, collect feedback, create support tickets, hold a natural
conversation across all of the above rather than being siloed per
feature.

**The one design principle everything else follows**: knowledge access
is not action permission. The assistant can *know* a fact (e.g. "your
WCoin balance is X") without that same request implying it can *act*
(e.g. "spend your WCoin") — those are two different capability grants,
checked independently, every time. See B16.

## B16 — AI permission model

```
PUBLIC                -- anyone, no login: "what build should I use?",
                          wiki search, general game questions
AUTHENTICATED_PLAYER   -- logged in, no extra grant: "what's my
                          character's level?", account-agnostic help
ACCOUNT_READ           -- explicit read grant on the player's own data:
                          "how much WCoin do I have?", "what's in my
                          inventory?"
ACCOUNT_ACTION         -- a real account-state change, always with an
                          explicit confirmation step: "update my email
                          preference", "cancel my listing"
MARKETPLACE_ACTION     -- consequential + reversible-with-care:
                          "sell my item" -- confirmation required,
                          shows exact terms before executing
PAYMENT_READ           -- "what did I pay for VIP last month?" -- read
                          only, never triggers a charge
ADMIN                  -- staff-only, entirely separate from the player-
                          facing assistant; not covered by this design
```

Worked examples, exactly as the request framed them:
- *"qual build usar?"* → `PUBLIC` — pure knowledge, no account touch.
- *"quanto WC tenho?"* → `AUTHENTICATED_PLAYER` + `ACCOUNT_READ` — a
  real balance query, but read-only.
- *"venda meu item"* → `MARKETPLACE_ACTION` — consequential, requires
  an explicit confirmation turn showing exact price/terms before
  anything executes; never a single-message silent action.
- *"compre VIP"* → `PAYMENT_READ`-adjacent but crossing into a real
  financial/economic action — same rule as marketplace: explicit
  confirmation, exact terms shown, never invisible.

**No action is ever invisible.** Every `*_ACTION` tier requires the
assistant to state exactly what it's about to do and get an explicit
yes before doing it — mirroring this project's own standing rule for
agentic tool use (never assume approval carries over from an earlier,
differently-scoped confirmation).

## B17 — AI data sources

```
PUBLIC          Wiki, game configuration (public-facing parts), patch
                 notes, progression guides, published economy rules,
                 event schedules
PRIVATE_PLAYER   Account data, characters, inventory, marketplace
                 listings/bids/wishlist, notification preferences
SENSITIVE        Payment history, KYC-adjacent data if any, security/
                 login history
ADMIN_ONLY       Internal telemetry, moderation records, unresolved
                 support-ticket internals, anything from the admin
                 control-plane surfaces this project already has
                 (Risk/Chargeback, GameBridge internals)
```
The assistant's retrieval layer must enforce this classification at
the data-source boundary, not trust the model to self-censor after
retrieval — the same "never widely read a secret-bearing surface"
discipline this project already applies to its own agent tooling
(`AGENTS.md` invariant 14) should extend to what the assistant is even
allowed to fetch for a given permission tier, not just what it's told
not to repeat.

## B18 — Assistant memory

Store: user preferences (favorite class, playstyle), goals (e.g. "get
to Master Level 200"), wishlist items, notification-channel
preferences, conversation context needed for continuity across
sessions (not per-message amnesia, but also not unbounded raw
transcript retention).

Never store: passwords, tokens, session secrets, payment credentials,
or any raw security data — these are never the assistant's to remember
even transiently; they're handled by the existing account/payment
systems, and the assistant only ever gets a permission check against
them (B16), never the values themselves.

`ASSISTANT_MEMORY_BOUNDARY`: memory is *preference and goal state*,
never *credential or security state*. If a fact would let someone
impersonate or financially act as the player if leaked, it does not
belong in assistant memory, full stop — it belongs in the systems that
already exist to hold it securely, queried fresh each time under the
B16 permission model instead of cached.

## B19 — Game AI future (architecture only, no bot)

```
Phase 1  Knowledge assistant        (this document's core scope --
                                      answer, explain, search)
Phase 2  Telemetry analysis          (read-only insight generation from
                                      already-collected data, e.g.
                                      "players who reset at level X
                                      typically also do Y" -- analysis,
                                      not action)
Phase 3  Recommendations             (proactive, opt-in suggestions
                                      built on Phase 2's analysis --
                                      still read-only from the game's
                                      perspective)
Phase 4  Event/social assistant      (event reminders, group-forming
                                      help, social features -- still no
                                      in-game action)
Phase 5  Allowed game actions        (a bounded, explicitly-permitted
                                      set of actions a player opts the
                                      assistant into performing on their
                                      behalf -- e.g. auto-listing an
                                      item at a player-set price -- each
                                      one its own B16-style permission
                                      grant, never a blanket "act for
                                      me")
Phase 6  Advanced autonomous gameplay research (explicitly research-
                                      only at this stage -- no
                                      commitment to build; this is
                                      the line between "assistant" and
                                      "bot/autoplay" and it stays a
                                      deliberately separate, later,
                                      unscoped decision)
```
**The assistant/bot line is Phase 4 vs. Phase 5, not blurred anywhere
before it.** Everything through Phase 4 only ever reads, explains, and
notifies — it never plays the game or acts on the player's behalf
without an explicit, narrow, opt-in grant per action type, which is
what Phase 5 exists to define carefully rather than rush into.
