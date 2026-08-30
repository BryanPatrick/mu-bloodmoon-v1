---
status: DRAFT
category: product/economy-audit
audience: internal (product/engineering)
lastVerified: 2026-08-29
---

# MundoGMO / Santiago EXP Calculator Reference (Part L)

## What was already in the knowledge corpus vs. what required new research

The local knowledge corpus (`knowledge/vendor-sweep/`) contains exactly **one** video from a channel matching "Santiago": `qJ6Xp6o51C8` ("SanTiago - MMORPG" / `@EuSanTiago`), already cataloged as `KI-008`, `bloodMoonStatus: OTHER_SERVER`. That video is about a Chaos Machine upgrade session on **RealMU** (a different private server, explicitly not Blood Moon) and contains **no EXP calculator content at all**. It is unrelated to the calculator referenced in this phase's spec — this was checked directly (`knowledge/vendor-sweep/normalized/youtube/qJ6Xp6o51C8.md`) rather than assumed.

"MundoGMO" does not appear anywhere in the local corpus, and no `Research/YouTube/mundogmo` channel directory exists locally (only `eusantiago`, `mubloodmoon`, `project-gamers-oficial` do). **This required live web research this phase — it was not sitting in the corpus waiting to be found.**

## What MundoGMO actually is

`mundogmo.com.br` — a Brazilian MU Online community site. It hosts an EXP/leveling calculator at `mundogmo.com.br/calculadora-de-experiencia/` (also linked as `/calculadora/` and `/nova-calculadora/`). Per the site's own description, the calculator was originally built by players from a server called **HELHEIM**, credited to a contributor named **Thomas Louis**, and made available for reuse on MundoGMO.

## Methodology (concept only — no code copied)

- **Primary input mode**: player enters their observed EXP-gain rate (per second), current level, current progress within that level (a 0–10 bar), and a target level.
- **Alternative input mode**: daily playtime (hours/day) and number of days, plus starting level/progress — projects a final level reached after that time budget.
- **Output**: time remaining to target level, total EXP required, projected final level/progress after a given time window.
- **Core mechanic**: the underlying per-level EXP curve is described by the site itself as staying "protegida no servidor" (protected server-side) — i.e. the actual EXP-to-level table is not exposed as static data the visitor can see; the calculator submits the player's inputs and the server-side table does the lookup. The visible approach is: `time_to_level ≈ EXP_still_needed / EXP_per_second_reported_by_player`, i.e. a straightforward rate-and-remaining-distance projection, **not** a model of server multipliers, map bonuses, or VIP effects — the player has to supply their *already-observed* real rate, which implicitly bakes in whatever multipliers were active when they measured it.

## How to use this as reference/methodology for Blood Moon (not as a source of Blood Moon numbers)

Per the explicit instruction: **do not assume GMO/HELHEIM server rates equal Blood Moon rates**, and do not copy the implementation. The reusable idea is the *shape* of the calculation, not any specific number from that site:

1. A real per-level EXP-required table (Blood Moon's own, not HELHEIM's) is the necessary input — this is exactly what Part I of this phase's audit is trying to obtain from the real server (`Data\Util\ExperienceTable.txt` was found to be only 133 bytes, i.e. almost certainly a small multiplier/reference value, not a full 1–1450-level curve like MundoGMO's; see the parallel economy-config audit for what that file actually contains).
2. Given that real table plus Blood Moon's real, confirmed XP multiplier stack (base rate, VIP, seals/buffs, party, map — Parts I/J/K), the same "remaining EXP / effective rate = time" projection can be built honestly for Blood Moon, without inventing a number MundoGMO never measured for this server.
3. The "resets per week" target framing in Part H (approximately 2–3/week, not/day) can be sanity-checked the same way once Blood Moon's real numbers are in: total EXP for a full reset cycle (level 1→400) divided by a realistic effective EXP/second for a normal (non-boosted, non-carried) player, converted to hours/week at a plausible playtime assumption — but this calculation should not be finalized until Parts I/J/K's real audit results are in, to avoid presenting a guess as a confirmed methodology output.

## Sources

- [Calculadora de EXP - MundoGMO](https://mundogmo.com.br/calculadora-de-experiencia/)
- [Calculadora de Tempo para Upar - MundoGMO](https://mundogmo.com.br/calculadora/)
- [Nova Calculadora - MundoGMO](https://mundogmo.com.br/nova-calculadora/)
