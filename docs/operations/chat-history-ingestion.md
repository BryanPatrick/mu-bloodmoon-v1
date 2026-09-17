---
status: DESIGN_ONLY — NOT_IMPLEMENTED
category: operations
audience: internal (engineering)
lastVerified: 2026-09-17
---

# Chat history ingestion — plan (design only, not executed)

## Why this doc exists

Bryan has a large amount of prior ChatGPT conversation history relevant
to this project's decisions and context. No agent working in this
repository or the Knowledge Hub has automatic access to that history.
This doc is the plan for *if and when* Bryan provides it — it is not a
claim that any of it has happened yet. See
[`../../context/RAW_HISTORY_AND_INGESTION.md`](../../context/RAW_HISTORY_AND_INGESTION.md)
for the policy this plan implements.

**Nothing in this document should ever be read as evidence that a real
transcript has been ingested.** Check `context/SOURCE_INDEX.md` for the
current, real count of `SOURCE_PENDING`/`CHAT_TRANSCRIPT` sources — as
of this document's last verification, that count is zero.

## How Bryan can provide history

1. Export the conversation(s) from ChatGPT (the platform's own export
   feature produces a JSON/HTML archive).
2. Place the export somewhere an agent session can read it — this
   repository's scratchpad, a dedicated (gitignored) `imports/` folder,
   or hand it directly to a session as an attached file.
3. Say explicitly which conversation(s) it is and roughly what
   timeframe/topic it covers — this is what lets an agent assign a
   real, honest `SRC-CHAT-*` ID instead of a vague one.

## Storage format

- Raw export stays as-is, untouched, in a gitignored location (never
  committed — it may contain personal data, and per this project's data
  policy, personal data is never copied into a shared repo without a
  specific, later-justified need).
- A parsed, structured intermediate (JSON) is generated from it, containing
  only what steps 2-4 below actually extract — not the raw prose.

## Source IDs

Each real, supplied transcript gets a real ID: `SRC-CHAT-NNN`, assigned
only once the transcript actually exists locally and has been read. Never
pre-assigned speculatively. Recorded in
`context/SOURCE_INDEX.md` alongside the export's rough date range and
topic, as told by Bryan.

## Pipeline (structured extraction, not prose dumping)

```
export → parse → candidate items → dedupe → classify →
cross-reference existing decisions → human/agent validation →
canonical promotion
```

1. **Parse** — split the export into individual messages/exchanges.
2. **Candidate items** — extract discrete, structured candidates, not
   paragraphs. Output shape (matches
   `context/RAW_HISTORY_AND_INGESTION.md`):
   ```json
   {
     "new_decisions": [],
     "changed_decisions": [],
     "ideas": [],
     "requirements": [],
     "open_questions": [],
     "tasks": [],
     "knowledge_candidates": [],
     "source_references": []
   }
   ```
3. **Dedupe** — semantic, not just string-match. The same idea restated
   across multiple messages becomes one canonical candidate plus an
   evidence count (how many times it recurs), not N separate items. A
   candidate that changes an existing decision becomes a
   `changed_decisions` entry with an explicit `supersedes` link, never a
   silent overwrite.
4. **Classify** — every candidate gets one of `FACT`/`DECISION`/
   `REQUIREMENT`/`IDEA`/`OPEN_QUESTION`/`DEFERRED`/`SUPERSEDED` (see
   `context/RAW_HISTORY_AND_INGESTION.md`'s taxonomy). Never collapsed.
5. **Cross-reference existing decisions** — check every candidate
   `DECISION`/`changed_decisions` entry against `context/DECISIONS.md`'s
   real index (ADRs + Knowledge Hub) before proposing it as new. A match
   becomes evidence for an existing decision, not a duplicate.
6. **Human/agent validation** — nothing from this pipeline is
   canonical until either Bryan confirms it, or (for lower-stakes items
   like a knowledge candidate) an agent explicitly reviews it against
   existing sources and states its confidence.
7. **Canonical promotion** — only after step 6: a new ADR, a new
   `context/` entry, or a new Knowledge Hub `knowledge_items`/`decisions`
   row, each carrying its real `SRC-CHAT-NNN` source reference.

## Privacy and secret scan

Before any parsed intermediate is committed or promoted: scan for
secrets (same pattern class as `context/validate.mjs`) and for personal
data beyond what the project's data policy allows. A transcript
containing either is flagged and requires explicit sign-off before any
extracted content proceeds past step 4.

## Designed for incremental future imports

This pipeline is per-export, not one-time. A second, later export from
Bryan re-runs steps 1-7 against the *same* `context/DECISIONS.md` index,
so step 5's cross-reference naturally catches anything already promoted
from an earlier import — no manual "did we already do this" tracking
required beyond what `SOURCE_INDEX.md` and `DECISIONS.md` already record.

## What would need to happen to actually run this

- A real export, actually supplied.
- Explicit confirmation from Bryan that ingesting it is wanted now (this
  plan does not authorize itself).
- A session scoped specifically to run steps 1-7 above, with enough
  budget to do step 6 (validation) properly rather than rubber-stamping.
