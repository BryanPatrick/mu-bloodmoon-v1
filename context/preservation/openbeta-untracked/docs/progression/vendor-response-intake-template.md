---
status: TEMPLATE — ready to use, no responses recorded yet
category: progression
audience: internal (product + engineering)
lastVerified: 2026-09-04
confidence: N/A (process template)
---

# Vendor response intake template (Phase W Part 13)

**Purpose**: when a real vendor response to
[`xp-vendor-package-pt-br.md`](xp-vendor-package-pt-br.md) eventually
arrives, record it here — one block per question — before treating it
as fact anywhere else in this project's documentation. This exists
because informal vendor wording (a Discord message, a forum reply, a
support ticket) is not automatically mathematical proof, and this
project's own discipline (`AGENTS.md`, `docs/protocols/agent-bootstrap.md`)
requires marking confidence explicitly rather than silently upgrading
an informal answer to a `CONFIRMED` fact.

## How to use this template

For each of the 8 questions, copy the block below, fill it in exactly
as received (do not paraphrase the vendor's own words in the `VENDOR
ANSWER` field — quote them), and only update
`xp-formula-evidence-and-vendor-questions.md`'s evidence table (moving
a row from `UNKNOWN` to a real confidence level) once `CONFIDENCE` here
is `HIGH` or the answer includes a verifiable worked example matching
this server's own real values (`MaxLevel=400`, not the vendor's stock
`MaxLevel=1000` example).

```
### Question N — <short title>

QUESTION: <exact question text as sent, from xp-vendor-package-pt-br.md>

VENDOR ANSWER: <exact quoted text of what the vendor said, verbatim,
  original language preserved>

DATE: <YYYY-MM-DD the answer was received>

SOURCE: <exactly where this came from -- e.g. "Discord DM,
  <vendor handle>, <channel>" / "support ticket #<id>" / "forum post,
  <url>" -- never left blank>

INTERPRETATION: <this project's own plain-language reading of what the
  vendor said, kept clearly separate from the vendor's own words above>

CONFIDENCE: <LOW / MEDIUM / HIGH -- LOW = informal/ambiguous wording,
  no worked example; MEDIUM = clear statement but no example matching
  our own MaxLevel=400; HIGH = a worked example using our own real
  config values, or source code/formula shown directly>

FOLLOW-UP: <any remaining ambiguity that would need a second question,
  or NONE if fully resolved>
```

## Current status

```
RESPONSES_RECORDED = 0 of 8
XP_FORMULA_EVIDENCE_TABLE_UPDATED = NO (nothing to update yet)
```

No response has been received for any of the 8 questions — the
package itself has not been sent (see
`xp-vendor-package-pt-br.md`'s own `SENT = NO`). This template exists
so that whenever contact is made, the response is captured with the
same evidentiary discipline the rest of this investigation has used,
rather than being absorbed informally into someone's memory or a chat
thread that this project's documentation can't later verify against.

## Related systems

`docs/progression/xp-vendor-package-pt-br.md`,
`docs/progression/xp-formula-evidence-and-vendor-questions.md`,
`docs/protocols/agent-bootstrap.md` (the fail-closed/never-guess
discipline this template exists to uphold).
