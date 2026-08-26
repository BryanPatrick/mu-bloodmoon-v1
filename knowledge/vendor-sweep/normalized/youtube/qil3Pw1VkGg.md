---
sourceId: KI-014
videoId: qil3Pw1VkGg
title: Custom Event PvP All - ADDED 6.6
channel: ProjectGamers Developers (@projectgamersoficial)
sourceAuthority: PROVIDER_TUTORIAL
providerVersion: ADDED 6.6
topics: [systems, events, pvp]
raw: ../../../../../Research/YouTube/project-gamers-oficial/transcripts/qil3Pw1VkGg.pt.json
---

# Custom Event PvP All (kill-all free-for-all)

A GM-opened PvP event: GM issues an open command with an event index, players join via `/participar <event-name>`. Players cannot attack each other until the GM closes/starts the event. Scoring: kill = +2 points, death = -1 point (configurable, can be zeroed to not penalize death). Ranking by points determines 1st/2nd/3rd place, each with independently configurable currency rewards (multiple currencies mentioned: a ranking/honor coin, WCoin, Gold, GoblinPoint).

## Demonstrated live

2 characters (BK, SM) fought; BK landed 4 kills (8 points) and died once (-1, netting 7); SM landed 1 kill (2 points) and died 4 times (netting 0/negative). BK placed 1st.

## Entities

`CustomEventPvpAll` (SYSTEM), first fully event-mechanics source in this sweep — a candidate for a future `EVENT` entity type once more events are captured with comparable detail.

## Claims

CLAIM-024, CLAIM-025, CLAIM-026
