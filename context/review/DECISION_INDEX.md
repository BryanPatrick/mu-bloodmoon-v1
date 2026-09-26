---
status: ACTIVE
category: context-pack
audience: internal (the assigned independent reviewer)
lastVerified: 2026-09-17
---

# Decision index (condensed)

Full tables: [`../ADR_INDEX.md`](../ADR_INDEX.md) (30 ADRs) and
[`../KNOWLEDGE_HUB_MAPPING.md`](../KNOWLEDGE_HUB_MAPPING.md) (26 Hub
decisions). This file is the condensed cross-check summary.

```
Blood Moon ADRs total          = 30 (0001-0030)
  tracked on main               = 9
  preserved from openbeta, read = 21
  ~~fully current, no issues~~  = 25 entries not flagged for supersession;
                                  preserved-only currentness remains candidate,
                                  not a blanket canonical promotion
  partially superseded          = 3  (0025/0026/0028, by 0029)
  implemented since original    = 2  (0011, 0013 -- now closed by 0022/0023)

Knowledge Hub decisions total  = 26
  discovered                    = 26
  reviewed (real content read)  = 26
  indexed (domain-mapped)       = 26
  flagged NEEDS_REVIEW/stale     = 8  (2 unresolved/partly contradicted: cf5f14c2, 53034c0c;
                                       6 flagged NEEDS_REVIEW: fa3fd2f1, 8200f60a,
                                       3acb56e0, d1637a85, 183be585, 86fc102b)
```

## ID-scheme rule (do not violate this in your own review notes)

Blood Moon ADR numbers and Knowledge Hub decision UUIDs are BOTH
permanently canonical. `DEC-<DOMAIN>-NNN` is a non-canonical alias
scheme only — zero have ever been minted. If your review proposes a
new decision, cite it by domain + a plain description, not a new ID
scheme of your own.
