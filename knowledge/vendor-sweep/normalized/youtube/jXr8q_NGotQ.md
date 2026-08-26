---
sourceId: KI-006
videoId: jXr8q_NGotQ
title: Primeiras Configurações do Servidor
channel: ProjectGamers Developers (@projectgamersoficial)
sourceAuthority: PROVIDER_TUTORIAL
season: null
providerVersion: null (general orientation, not tied to one update)
topics: [guides, orientation, operations]
raw: ../../../../../Research/YouTube/project-gamers-oficial/transcripts/jXr8q_NGotQ.pt.json
---

# GameServer Data/ folder taxonomy (vendor orientation)

The vendor's own beginner tour of the `Data/` folder tree — see the full table already published as a Wiki candidate: [../wiki_candidates/guides/data-folder-taxonomy.md](../wiki_candidates/guides/data-folder-taxonomy.md).

## Split into atomic claims

This video's content deliberately splits into 3 separate atomic claims rather than one compound summary, per Part G's granularity rule:

- **CLAIM: Data/Command contains player/GM command configuration.** (implicit in the folder tour, not separately extracted as a numbered claim this round — low novelty)
- **CLAIM: Data/Event contains per-event on/off + tuning config.** (same — low novelty, already known from docs/events-system.md)
- **CLAIM-014: The vendor explicitly warns against copying Data/Command and Data/Event between GameServer instances when replicating config, because they legitimately differ per instance.** (the one claim with real operational novelty — recorded in atomic-claims.json)

## Entities

`GameServer/Data/`, `Data/Command`, `Data/Event`, `Data/Custom`, `Data/SharoMix`, `Data/Character`, `Data/Skill`, `Data/Item`, `Data/Monster`

## Related

Wiki candidate: [[data-folder-taxonomy]]
