---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-19
confidence: MIXED — per-row and per-classification confidence below; second-hand evidence is labelled as such
---

# Currency terminology and mapping (Phase 20)

Resolves **GAP-P18-11** (are the presenter's "Cash / Gold / PcPoint" and the
engine's `WCoinC / WCoinP / GoblinPoint` the same three currencies?) and
bounds the two questions that sit next to it: what **Blood Coin** is, and
which game currency the Portal's **WC** corresponds to. Analysis of *how* a
Portal purchase could reach the game lives in
[`GAME_CURRENCY_DELIVERY_ANALYSIS.md`](GAME_CURRENCY_DELIVERY_ANALYSIS.md);
this file only fixes vocabulary.

## Bottom line

1. **Two vocabularies, one set of three slots.** `Cash | WCoinC`,
   `Gold | WCoinP` and `PcPoint | GoblinPoint` are paired names for the same
   three balances, in that order. Blood Moon's own config and message table
   use both families for the same triple. No source read in this phase treats
   them as different balances. **(Phase 20A)** All three pairs are now **CONFIRMED**: the
   vendor's own stored procedures (read first-hand in the lab restore of the production
   backup) label the balances "Cash | WCoinC", "Gold | WCoinP", "PcPoints | GoblinPoint" and keep
   Season 4 variants (`MEMB_INFO.Cash`, `MEMB_INFO.Gold`, `PcPointData.PcPoint`) beside the Season 6/8
   `CashShopData` columns. ~~The other two are STRONGLY_SUPPORTED.~~
2. **The Portal's WC is not mapped to any of them** — reconfirmed by Bryan on 2026-09-19, who also
   put automatic Portal-WC → game-currency delivery **out of scope for the initial Beta**
   (`BETA_INITIAL_GAME_CURRENCY_DELIVERY = OUT_OF_SCOPE`; CLAIM-147). No recorded decision
   maps Portal `WCOIN` to `WCoinC`, `WCoinP` or anything else, and several
   documents explicitly decline to. Status: **UNRESOLVED (open by earlier
   decision, not by oversight)**.
3. **Blood Coin is not WC.** Technical code `GOBLIN_POINT`, public name
   "Blood Coin" (decision of 2026-09-05). Whether it equals the engine's
   `GoblinPoint` is unconfirmed.
4. **Three slot-numbering bases are in use across the engine's own files.**
   A raw slot number must never travel between subsystems (Part 4).

## Part 1 — What was read, and how strong each source is

| Source | Kind | Strength |
|---|---|---|
| `RemoteData/Phase6/CustomEventAuction.txt` (real Blood Moon config, snapshot 2026-08-27) | first-hand, read this phase | strongest available — explicit pairing of all three |
| `RemoteData/Phase10/Message.utf8.txt` (real message table, snapshot 2026-08-28) | first-hand, read this phase | strong — both label families used for the same triple |
| `RemoteData/Phase11/GameServerInfo - Command.readable.txt` (`/util` block, snapshot 2026-08-29) | first-hand, read this phase | medium — names the three coin operands Cash/Gold/PcPoint |
| `Research/Vendor/Tutorials/GameServerInfo - Common.htm`, `Script Lua Interface Functions.rtf` (vendor docs) | first-hand, read this phase | strong for *engine* naming |
| **(Phase 20A)** `dbo.WZ_SetCoin` and seven sibling procedures, read **first-hand** from the lab restore of the 2026-07-16 production backup — `references/game-data/sql-discovery/phase-20a-wz-setcoin-cashshopdata-lab-20260919/raw/01…10` (sha256s in that README) | first-hand, read-only catalog reads; authorized by Bryan | **strongest** — several independent procedures; supersedes the row below |
| ~~`WZ_SetCoin` inline comments, quoted in `context/preservation/openbeta-untracked/docs/economy/xshop-commercial-review.md:46-47`~~ | **second-hand** — an earlier phase read the procedure body in the local lab database; the body itself is **not preserved in this repository** (searched, not found) | strong but not independently re-verifiable here |
| Preserved lab-DB dependency data (`stored-procedures.md:88`, `cashshop-commercial-review.md:65-75`) | second-hand | supports the `CashShopData` target columns |

Nothing here was read from, or written to, a production system in Phase 20.

## Part 2 — Terminology inventory

PF = player-facing · DB = database field · ENG = engine term · POR = Portal
term. Confidence: HIGH explicit definition / MEDIUM clear usage / LOW passing
mention. Line numbers are those of the file as read on 2026-09-18.

| TERM | SOURCE | CONTEXT | PF | DB | ENG | POR | VERSION | CONF |
|---|---|---|---|---|---|---|---|---|
| **Cash** | `Phase6/CustomEventAuction.txt:13` | comment `1 = Cash/WCoinc` (block: lines 11-16) | no | — | yes | no | snapshot 2026-08-27 | HIGH |
| Cash | `Phase10/Message.utf8.txt` id 980, 1033, 1145 | "Seu saldo é %d Cash, %d Gold, %d PcPoint!" | yes | — | yes | no | 2026-08-28 | HIGH |
| Cash | same file, id 1140 | "Você precisa de mais **Cash/WCoinC**!" — both names in one sentence | yes | — | yes | no | 2026-08-28 | HIGH |
| Cash | `Phase11/GameServerInfo - Command.readable.txt:706` | `CommandUtilSyntaxName1 = Cash` (`/util` is `CommandUtilSwitch = 0`, disabled) | yes (when on) | — | yes | no | 2026-08-29 | MEDIUM |
| Cash | vendor `Script Lua Interface Functions.rtf` (ObjectGetCoin) | "Returns Cash Shop/PCPoints Coin1, Coin2, Coin3" | no | — | yes | no | vendor doc | HIGH (grouping) |
| **Gold** | `CustomEventAuction.txt:14` | `2 = Gold/WCoinP` | no | — | yes | no | 2026-08-27 | HIGH |
| Gold | Message id 980/1033/1145 | second operand of the same triple | yes | — | yes | no | 2026-08-28 | HIGH |
| Gold | `apps/web/pages/painel/admin/progressao.vue:293` | "Gold" = **VIP tier** (Free/Bronze/Silver/Gold) — a name collision, *not* the currency | yes (admin) | — | no | yes (VIP tier) | 2026 | HIGH |
| **PCPoint** | `CustomEventAuction.txt:15` | `3 = PcPoint/GoblonPoint` (typo in the file) | no | — | yes | no | 2026-08-27 | HIGH |
| PCPoint | Message id 980/1033/1145 | third operand of the triple | yes | — | yes | no | 2026-08-28 | HIGH |
| PCPoint | `Phase6/GameServerInfo-Common.utf8.txt:57-58` | `WritePcPointLog` and `WriteCashShopLog` are two separate log switches | no | — | yes | no | 2026-08-27 | MEDIUM (see Part 4 caveat) |
| **WCoinC** | vendor `GameServerInfo - Common.htm:385` | `CashShopWCGiftEnable` = gift for "WCoinC" — note the engine abbreviates it **WC** | no | `CashShopData.WCoinC` | yes | no | vendor doc | HIGH |
| WCoinC | Message id 632, 780, 819 | "WCoinC: %d, WCoinP: %d, GoblinPoint: %d" | yes | — | yes | no | 2026-08-28 | HIGH |
| WCoinC | `GameServerInfo-Custom.utf8.txt` | store name ".::WCC STORE::." "vendidos por WCoinC" | yes | — | yes | no | 2026-08-27 | HIGH |
| WCoinC | `apps/game-bridge-agent/GameDatabase/CurrencyModels.cs:9` | `record CashShopBalances(int WCoinC, int WCoinP, int GoblinPoint)` — read-only SELECT | no | `CashShopData.*` | yes | no | 2026-08-20 | HIGH |
| **WCoinP** | vendor `Common.htm:387` | `CashShopWPGiftEnable` = gift for "WCoinP" (abbrev. **WP**) | no | `CashShopData.WCoinP` | yes | no | vendor doc | HIGH |
| WCoinP | Message id 632/780/819 | second operand | yes | — | yes | no | 2026-08-28 | HIGH |
| **GoblinPoint** | vendor `Common.htm:389,397` | `CashShopGPGiftEnable` = "Goblin Point" (abbrev. **GP**); `CashShopGoblinPointDelay` = minutes needed to *earn* GoblinPoints | no | `CashShopData.GoblinPoint` | yes | no | vendor doc | HIGH |
| GoblinPoint | `apps/api/prisma/schema.prisma:48-52` | Portal `CurrencyCode.GOBLIN_POINT` — same string, **unconfirmed** same currency | no | `AccountCurrency.currency` | no | yes | 2026 | HIGH (that it is unconfirmed) |
| **Blood Coin** | `docs/phases/blood-coin-public-name-completion/phase-manifest.md:4-11,137-139` | "PUBLIC_NAME = Blood Coin / TECHNICAL_CODE = GOBLIN_POINT" | yes | `AccountCurrency.currency = GOBLIN_POINT` | unknown | yes | Fase AD, 2026-09-05 | HIGH |
| Blood Coin | `apps/web/data/management.ts:3-7` | "Lucas already renamed the GameServer-facing side to match" — **no confirming source found** | yes | — | unknown | yes | 2026-09-05 | LOW (that the rename happened) |
| Blood Coin | `RemoteData/Phase6/10/11` | **NOT FOUND** in any real game config or message (snapshots predate the decision) | — | — | — | — | — | — |
| **WC / WCoin** (Portal) | `apps/api/prisma/schema.prisma:48-52,1292-1308` | `CurrencyCode.WCOIN`; `AccountCurrency` row; R$ 1 = 1 WC (ADR-0008) | yes ("WCoin", "WC") | `AccountCurrency`, `WalletLedgerEntry` | no | yes | 2026 | HIGH |
| WC (engine abbrev.) | vendor `Common.htm:385` | `CashShopWCGiftEnable` — **"WC" is the engine's abbreviation for WCoinC** | no | — | yes | no | vendor doc | HIGH |
| WCoin (legacy web) | `docs/game-vps-sqlserver-transition.md:17` | legacy AdminCP mapping "WCoin → CashShopData.WCoinC" | no | `CashShopData.WCoinC` | legacy | no | pre-Portal | MEDIUM |

Terms met but out of scope for the mapping: **HUNT_POINT** (Portal enum; the
real `Character.HuntPoints` column is per-character and no document links it
to the Portal currency — see Part 6), **Ruud** (message id 1158; not a column
on the real `Character` table), **Zen** (`Character.Money` / `warehouse.Money`,
distinct columns).

## Part 3 — How the two vocabularies coexist in Blood Moon's own files

* The **message table** uses `WCoinC/WCoinP/GoblinPoint` for `/buyvip` and
  store errors (ids 632, 780, 819) and `Cash/Gold/PcPoint` for the `/util`-style
  and event messages (980, 1033, 1145) — same server, same triple, different
  label sets, sometimes both in one string (id 1140).
* **Sibling config files** carry the three columns under either header
  (`CustomEventQuickly.txt`: "Cash Gold PcPoint"; `CustomGuildVsGuild.txt`:
  "WCoinC WCoinP GoblinPoint"), always in the same order.
* The vendor's Lua API groups them as one triple (`Coin1, Coin2, Coin3`).

## Part 4 — Mapping classification

Scale: `CONFIRMED` · `STRONGLY_SUPPORTED` · `INFERRED` · `UNKNOWN` ·
`CONTRADICTED`. Rule applied: never claim more than the evidence, and do not
force a 1:1 mapping where the evidence is one-sided.

| Pair | Class | Evidence | What would raise it |
|---|---|---|---|
| **Cash ↔ WCoinC** | **CONFIRMED** | (1) explicit pairing in the real `CustomEventAuction.txt` comment; (2) explicit pairing in the real message id 1140 (an *independent* first-hand source); (3) `WZ_SetCoin` `@Value1` = "Cash \| WCoinC" (second-hand); (4) same-position sibling headers; (5) the legacy web panel's "WCoin" edits only `WCoinC`. No contradicting source found. | — |
| **Gold ↔ WCoinP** | ~~STRONGLY_SUPPORTED~~ **CONFIRMED (Phase 20A)** — the "Update Gold \| WCoinP" comment in `WZ_SetCoin`, `WZ_SetExchangeReward`, `WZ_SetKD` and the ranking procedures, and their Season 4 `MEMB_INFO.Gold` variants, are first-hand and independent of the config files (CLAIM-142). Earlier evidence, kept: | (1) explicit pairing in `CustomEventAuction.txt`; (3) `WZ_SetCoin` `@Value2` = "Gold \| WCoinP" (second-hand); (4) sibling headers. ~~Only one first-hand explicit pairing and no per-slot runtime proof.~~ | ~~a second first-hand pairing, or reading the procedure body~~ — **done in Phase 20A** |
| **PcPoint ↔ GoblinPoint** | ~~STRONGLY_SUPPORTED~~ **CONFIRMED (Phase 20A)** — "Update PcPoints \| GoblinPoint" in `WZ_SetCoin`/`WZ_SetExchangeReward`, and the Season 4 `PcPointData.PcPoint` variant beside the Season 6/8 `CashShopData.GoblinPoint` line (CLAIM-142). Earlier evidence, kept: | same as Gold. Extra caveat: the vendor has a separate `WritePcPointLog` switch and describes PcPoint as time-earned, which *fits* GoblinPoint (also time-earned) but does not by itself prove it (the separate log switch is explained: both are Season 4 `PcPointData` legacy names). | ~~same~~ — **done in Phase 20A** |

`CONTRADICTED` was searched for and **not found**. Two things that *look*
like contradictions and are not:

* `CoinIndex = 508` in `CashShopPackage.txt`: `cashshop-commercial-review.md:76-80`
  says it is **not proven** to select the same balance `WZ_SetCoin` governs.
  That is a question about the *CashShop's purchase deduction*, not about the
  Cash/Gold/PcPoint naming.
* GAP-P18-11's own sentence that Blood Moon's config uses "only the
  WCoin/GoblinPoint names" — that was **wrong** (Part 8).

### Slot numbering is not uniform — a raw number must never cross subsystems

| Where | Numbering | Evidence |
|---|---|---|
| `CustomEventAuction.txt` `CoinType` | **1-based, 0 = zen, 4 = item**: 1 Cash/WCoinC, 2 Gold/WCoinP, 3 PcPoint/GoblinPoint | comment lines 11-16 (read) |
| `CustomCoinsOnline.txt` `CoinType` | rows use **0, 1, 2** with no legend in the file; almost certainly 0-based (three rows, one per coin) — **INFERRED** | `RemoteData/Phase11/CustomCoinsOnline.readable.txt` |
| X-Shop `Coin0 / Coin1 / Coin2` | 0-based, three separate price columns = WCoinC/WCoinP/GoblinPoint | `docs/economy/xshop-cashshop-config-field-matrix.md:34` |
| Vendor Lua `ObjectGetCoin` etc. | 1-based `Coin1, Coin2, Coin3` | `Script Lua Interface Functions.rtf` |
| SQL `WZ_SetCoin` | positional `@Value1/2/3` | **first-hand since Phase 20A** (`raw/01`) |

Consequence for any future currency command: carry a **named** currency
(for example `GAME_CASH_WCOINC`), never a slot number; let exactly one place
translate names to whatever the target subsystem expects.

## Part 5 — Blood Coin

| Aspect | Value | Source |
|---|---|---|
| Technical name | `GOBLIN_POINT` (Portal `CurrencyCode`, unchanged everywhere) | phase manifest `:137-139` |
| Public / player-facing name | **Blood Coin**, decided 2026-09-05 (Fase AD) | phase manifest `:4-11`; `context/BUSINESS_RULES.md:27`; `context/domains/game-economy.md:24-34` |
| Is it WC? | **No.** WC is `WCOIN`; the two are separate options in every Portal UI and are listed as separate currencies of one three-currency system | `context/domains/game-economy.md:31`; `OfficialStoreFilters.vue:27-29` |
| Same as the engine's `GoblinPoint`? | **Unconfirmed.** "same string, unconfirmed same currency"; "assuming 1 GameServer GoblinPoint = 1 Portal Goblin Point would be an invented equivalence" | `phase-y-production-readiness-inventory.md:187`; `store/store-channel-boundaries.md:34-35` (both under `context/preservation/openbeta-untracked/docs/`) |
| Was the game side renamed too? | **Unverified.** `management.ts:6` says so; no game-side source found; the real config snapshots (2026-08-27..29) still say "GoblinPoint" | — |

Rule kept: **technical `GOBLIN_POINT` / public "Blood Coin"; never conflate
Blood Coin with WC.** The Portal also seeds real-money Pix packages for
`GOBLIN_POINT` (`commerce.service.ts:162-169`) even though ADR-0009 calls
GP "earn-only" — recorded in [`CONFLICTS.md`](CONFLICTS.md).

## Part 6 — What Portal WC corresponds to in the game

**PORTAL_WC_TARGET_GAME_CURRENCY = UNRESOLVED.** This is **not** an explicit
decision to map it, so per Phase 20's own rule it is left open and **not**
silently mapped to `WCoinC`.

What the record says (none of it defines a mapping):

| Statement | Source |
|---|---|
| The `WCoinC/WCoinP/GoblinPoint` labels are "deliberately a free string, not Portal's CurrencyCode enum, since these are a different, unreconciled currency domain" | `apps/api/prisma/schema.prisma:2054-2057` |
| "**no equivalence is assumed and no integration was built**"; whether "1 WCoinC = 1 Portal WCOIN, or a separate ledger entirely" **remains open, not decided here** | `docs/economy/legacy-dmn-cms-and-currency-investigation.md:40` |
| "Different currencies, no proven exchange rate … same-sounding names, no code anywhere reads or writes both" | `store/store-channel-boundaries.md:28-35` (preserved) |
| Portal balance is "diferente das moedas internas do próprio jogo (Zen, WCoinC/WCoinP, Goblin Points)" | `manuals/player/manual-player.md:181-184` (preserved) |
| ADR-0008: WCoin is "the in-game currency GameBridge/the GameServer actually understands" — states intent that WC is meaningful in game, **does not name a column** | `decisions/0008-wcoin-1to1-peg-with-brl.md:60-61` (preserved) |
| ADR-0008/0020/0022 define only the **R$ → WC** peg; none names `WCoinC` or `WCoinP` | ADR text |

**INFERENCE (not a decision):** the purchasable, R$-pegged Portal WC plays the
*role* the legacy web called "WCoin"/"Cash" — `WCoinC` (evidence: the legacy
panel's `add/remove/get_wcoins` touch only `WCoinC`; the legacy AdminCP table
maps "WCoin → CashShopData.WCoinC"). That is a reason to *propose* `WCoinC`,
not a reason to *assume* it: the Portal is also allowed to sell items and VIP
without ever putting a currency into the game.

Candidate targets, for Bryan's decision (see the analysis file for what each
implies):

| # | Candidate | Note |
|---|---|---|
| a | WC → `WCoinC` (Cash) | matches the legacy naming; the most "natural", still unproven |
| b | WC → `WCoinP` (Gold) | no evidence for it |
| c | WC is a Portal-only spend currency; the game never holds it | already how VIP works (Portal WC buys VIP; only the *tier* reaches the game) |
| d | WC converts to a game currency at a stated rate, one-way | needs a rate decision; the R$ 1 = 1 WC peg does not define it |

## Part 7 — Name traps

* **WC** = Portal `WCOIN` **and** the engine's abbreviation for `WCoinC`
  (`CashShopWCGiftEnable`). Never write bare "WC" in a document that also
  discusses engine currencies; say "Portal WC" or "WCoinC".
* **Gold** = a currency slot **and** a VIP tier name in the Portal.
* **HUNT_POINT**: ADR-0009 calls it a native GameServer currency;
  `phase-y-…inventory.md:188` says it has "no GameServer analog"; the real DB
  has `Character.HuntPoints` per *character*. Unresolved; not part of this
  mapping.
* **GoblinPoint** earned in-game by time (vendor doc) **and** sold for Pix by
  the Portal — two different "GP" behaviours under one name.
* **CoinIndex = 508**, **CoinType**, **Coin0/1/2**, **Coin1/2/3** are four
  different index conventions (Part 4).

## Part 8 — Corrections to earlier text

| Earlier text | Where | Correction |
|---|---|---|
| ~~Blood Moon's own config and message table use only the WCoin/GoblinPoint names~~ | `KNOWLEDGE_GAPS.md` GAP-P18-11 (Phase 18C/18D) | **(Phase 20)** They use both families: `CustomEventAuction.txt`, message ids 980/1033/1140/1145 and the `/util` operand names use Cash/Gold/PcPoint. |
| ~~CLAIM-043/053 list Cash/Gold/PcPoint "as separate options next to WCoin/GoblinPoint"~~ | GAP-P18-11 wording | **(Phase 20)** The vendor presenter lists both label sets; the claims stand as vendor statements, but the five names are two vocabularies for three slots, not five currencies. The claims themselves are unchanged. |

Machine layer: `CLAIM-125` … `CLAIM-130` in
`knowledge/vendor-sweep/atomic-claims.json`.

## Part 9 — Phase 20A (2026-09-19): what changed

| Item | Before | After |
|---|---|---|
| Cash ↔ WCoinC | CONFIRMED | CONFIRMED (now also first-hand in the vendor procedures) |
| Gold ↔ WCoinP | STRONGLY_SUPPORTED | **CONFIRMED** |
| PcPoint ↔ GoblinPoint | STRONGLY_SUPPORTED | **CONFIRMED** |
| Portal WC target game currency | UNRESOLVED | **UNRESOLVED** (Bryan, 2026-09-19: do not silently map to WCoinC) |
| Initial Beta game-currency delivery | not stated | **OUT_OF_SCOPE** (Bryan, 2026-09-19) |
| Blood Coin (`GOBLIN_POINT`) | not WC; equality with the engine's GoblinPoint unconfirmed | unchanged |

What the upgrade means and does not mean:

* It settles **vocabulary**: Cash/Gold/PcPoint are the Season 4 names, WCoinC/WCoinP/GoblinPoint the
  Season 6/8 names, of three balances in one order. A document may use either family, never both as if
  they were six currencies.
* It says **nothing** about the Portal. Portal `WCOIN` is a separate business abstraction; the
  mapping above gives no automatic equivalence, and the "INFERENCE" in Part 6 is still only an inference.
* The slot-numbering warning in Part 4 stands: the procedures are positional (`@Value1/2/3`), while
  other files number the slots 0-based or 1-based.

Evidence: `references/game-data/sql-discovery/phase-20a-wz-setcoin-cashshopdata-lab-20260919/` (raw catalog reads, hashes, derived findings); machine layer CLAIM-139..142, CLAIM-147.
