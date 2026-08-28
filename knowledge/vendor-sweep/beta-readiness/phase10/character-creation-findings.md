---
status: DRAFT
category: beta-readiness/phase10
audience: internal (feeds First 30 Minutes / FAQ / Returning Player / Help Center updates)
lastVerified: 2026-08-28
sourceEvidence: RemoteOps read-only inventory + download, D:\MU\RemoteData\Phase10\
---

# Character creation -- Phase 10, Part B findings

**CHARACTER_CREATION = PARTIAL** (real, Blood-Moon-specific evidence found; creation-screen-specific restrictions like name rules and slot count remain unconfirmed)

## What is CONFIRMED (real files read directly, not vendor video, not generic MU memory)

Downloaded and read `C:\MuServer\Data\Character\DefaultClassInfo.txt` (1068 bytes) via RemoteOps:

- **7 real classes exist**, indices 0-6, each with a distinct real base-stat template (Strength/Dexterity/Vitality/Energy/Leadership) and growth formula (MaxLife/MaxMana/LevelLife/LevelMana/VitalityToLife/EnergyToMana). Only class index 4 has a non-zero Leadership stat (25).

Downloaded and read `C:\MuServer\Data\Lang\Por\Message.txt` (48KB, Blood Moon's real Portuguese UI text table) via RemoteOps:

- Line 648 (Blood Moon's own real command-help text): **`"Comando: [/classe dw, dk, elf, mg, dl, su, rf]"`** -- 7 real class short-codes confirmed directly in Blood Moon's own text, matching the 7 stat rows found above.
- This same block of message text (lines 642-650) shows `/classe` is a class-CHANGE command for an EXISTING character (gated by level, gated by an account-level permission flag that can be disabled, requires choosing a class different from the current one) -- **not** the initial character-creation screen itself.

## What is NOT confirmed this session (do not invent)

- Whether all 7 classes are selectable at INITIAL character creation, or if any is locked/unlockable-only.
- Character name restrictions (length, characters allowed).
- Character slot count per account.
- The exact visual character-creation screen flow -- this is very likely hardcoded client-side UI (standard MU Online client architecture), not a server-side text config file, and inspecting compiled client binaries was judged out of scope for "safe read-only source inspection" this session.

## Expansion of the 7 class codes (labeled as convention, not independently found spelled out in Blood Moon text)

Blood Moon's own text confirms the exact codes `dw, dk, elf, mg, dl, su, rf`. The expansion below to full names follows the standard MU Online abbreviation convention used industry-wide -- it was **not** independently found spelled out as full names in any Blood Moon source this session, so it is presented as a high-confidence but not `BLOODMOON_CONFIRMED` convention, separate from the confirmed codes themselves:

| Código confirmado | Nome convencional (não confirmado literalmente no texto do Blood Moon) |
|---|---|
| dw | Dark Wizard |
| dk | Dark Knight |
| elf | Elf |
| mg | Magic Gladiator |
| dl | Dark Lord |
| su | Summoner |
| rf | Rage Fighter |

## Recommendation for player-facing content

Safe to publish: "O Blood Moon tem 7 classes de personagem (códigos reais confirmados: dw, dk, elf, mg, dl, su, rf)." Not yet safe to publish: a definitive statement about which classes are available at creation vs. unlockable later, or naming restrictions -- those remain `NEEDS_GAMEPLAY_VALIDATION`.
