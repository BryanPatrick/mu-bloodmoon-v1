# Wiki preparation

How captured knowledge turns into something the real Blood Moon Wiki could eventually use — and the line that keeps it from turning into that automatically.

## The line

**Nothing in `knowledge/vendor-sweep/wiki_candidates/` is published.** A candidate is a DERIVED artifact, written to be Wiki-shaped, but every one carries its source references and a `status: CANDIDATE` marker. Promotion to an actual Wiki page is a separate, deliberate, human-reviewed action — never automatic, never inferred from "this looks confirmed enough."

## Categories

`characters`, `classes`, `items`, `maps`, `monsters`, `events`, `systems`, `progression`, `guides`, `commands`, `NPCs`. As of 2026-08-25 only `systems` and `guides` have candidates (see below) — the other categories have no sweep-sourced material yet.

## What exists so far

| File | Category | Source authority | Blood-Moon status |
|---|---|---|---|
| `wiki_candidates/systems/custom-bot-store.md` | systems | PROVIDER_TUTORIAL | BLOODMOON_LIKELY |
| `wiki_candidates/systems/custom-bot-trader.md` | systems | PROVIDER_TUTORIAL | BLOODMOON_LIKELY |
| `wiki_candidates/systems/custom-bot-fusion.md` | systems | PROVIDER_TUTORIAL | BLOODMOON_LIKELY |
| `wiki_candidates/guides/data-folder-taxonomy.md` | guides | PROVIDER_TUTORIAL | UPSTREAM_MU |

Each candidate's frontmatter states its `status`, `confidence`, `source` (pointing back to the RAW transcript under `D:\MU\Research\`), and `bloodMoonStatus`. None has been cross-checked against Blood Moon's actual live config yet — that cross-check is exactly what would move a candidate from `BLOODMOON_LIKELY` to `BLOODMOON_CONFIRMED` and clear it for real publication.

## Progression knowledge

No progression-category candidates exist yet (leveling routes, item/map progression, reset progression, farming routes). The one progression-adjacent source captured this sweep — the EuSanTiago/RealMU upgrade-mechanics video — is explicitly `PROVIDER_SPECIFIC_OTHER_SERVER` and must not seed a Blood Moon progression candidate (see [source-authority.md](source-authority.md)).

## Knowledge graph relations (not yet built)

The task envisions relations like MAP→monsters/drops/progression, ITEM→source/monster/map/use, EVENT→entry-item/NPC/schedule/rewards, CLASS→skills/progression/items, SYSTEM→config/database/behavior, to support future Wiki cross-linking. This sweep captured individual SYSTEM entries but did not yet build the relational graph connecting them to MAP/ITEM/MONSTER/EVENT entities — that requires the equipment/map/monster catalogs already in `knowledge/equipment/` to be cross-referenced, which is future work.

## Promoting a candidate

1. Verify the candidate's claims against Blood Moon's actual runtime/config (not the vendor's generic tutorial default).
2. Update its `bloodMoonStatus` to `BLOODMOON_CONFIRMED` and add the confirming source to its frontmatter.
3. Only then move/adapt it into whatever the real Wiki's actual content pipeline is (not built by this sweep — this sweep only prepares candidates).
