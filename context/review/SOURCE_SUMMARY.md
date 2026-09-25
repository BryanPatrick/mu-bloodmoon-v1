---
status: ACTIVE
category: context-pack
audience: internal (the assigned independent reviewer)
lastVerified: 2026-09-17
---

# Source summary (condensed)

Full table: [`../SOURCE_INDEX.md`](../SOURCE_INDEX.md).

```
SRC-REPO-*     = 17 sources (this repo: AGENTS.md, bootstrap protocol,
                  docs/README.md, ADRs, git evidence, the 3 unmerged
                  architecture proposals, the Asaas handoff)
SRC-HUB-*      = 9 sources (Knowledge Hub docs, code, all 26 decisions,
                  staging config)
SRC-OPENBETA-* = 125 sources (the preserved openbeta archive)
Total          = 151 sources
SOURCE_PENDING = 0
```

Every source carries an authority level (`GOVERNANCE.md`'s 6-level
model). **The single most important thing to check as a reviewer**: does
every non-trivial factual claim in `context/` actually trace to one of
these 151 sources, or a directly-attributed live instruction from
Bryan? A claim with neither is `UNSUPPORTED` and should be flagged.

No `CHAT_TRANSCRIPT` source exists — nothing here claims to be from a
prior ChatGPT conversation.
