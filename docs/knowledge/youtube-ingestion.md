# YouTube ingestion

How video knowledge gets captured, and why the method changed mid-project.

## Target channels

Only channels explicitly referenced by this project are in scope — never broaden into unrelated channels found by generic search. As of 2026-08-25, exactly four channels have ever come up anywhere in the corpus:

| Channel | Status |
|---|---|
| `@projectgamersoficial` (ProjectGamers Developers) | **Target.** The actual vendor/engine creator — `ProjectGamers.dat` branding matches files throughout the real `MuServer` snapshot. 399 videos catalogued, 108 keyword-relevant. |
| `@EuSanTiago` (SanTiago - MMORPG) | **Target.** Named explicitly in the sweep task. 3 total videos. Sponsored by/affiliated with RealMU (a different MU server) — see [source-authority.md](source-authority.md) for why its content is classified `PROVIDER_SPECIFIC_OTHER_SERVER`, not Blood Moon knowledge. |
| `@mubloodmoon` | Blood Moon's own official channel. Found incidentally (referenced in `Data/Script/Script/WelcomeMessage.lua`). Not a vendor-tutorial target — out of scope for this kind of sweep. |
| `@kaspis4080` | Discarded. Belongs to an unrelated MU server ("mu.lv", Latvia), found by accident in old external research material. No relation to Blood Moon's vendor. |

## Two capture methods, and why the second one exists

**yt-dlp (CLI, no browser)** — used successfully for the first 3 transcripts on `project-gamers-oficial` early in the project, then started failing (`This video is not available`, then `HTTP 429 Too Many Requests`) after only 3 of 15 attempted extractions. The correct response, taken at the time, was to **stop** rather than install a JS runtime, route through a proxy, or retry aggressively against a rate limit — documented in `docs/vendor-video-index.md`.

**Real browser automation (current method)** — drives YouTube's own "Mostrar transcrição" (Show transcript) UI feature via `mcp__Claude_Browser__javascript_tool`, not `get_page_text`/`read_page` (neither reliably surfaces this dynamically-loaded panel). This is both more legitimate (uses YouTube's own accessible feature, not a workaround) and, empirically, unblocked where yt-dlp was blocked.

### Working extraction pattern

```js
(async () => {
  await new Promise(r => setTimeout(r, 1800)); // let the page settle
  // video metadata via the page's own schema.org ld+json block
  const ld = document.querySelector('script[type="application/ld+json"]');
  const { uploadDate } = JSON.parse(ld.textContent);

  let btn = document.querySelector('button[aria-label="Mostrar transcrição"]');
  if (!btn) { // sometimes only appears after expanding the description
    document.querySelector('tp-yt-paper-button#expand, #expand')?.click();
    await new Promise(r => setTimeout(r, 800));
    btn = document.querySelector('button[aria-label="Mostrar transcrição"]');
  }
  btn?.click();
  await new Promise(r => setTimeout(r, 3500));

  // YouTube A/B-tests two different transcript panel implementations —
  // check both, use whichever is populated.
  let segs = document.querySelectorAll('transcript-segment-view-model'); // newer
  let mode = 'new';
  if (!segs.length) { segs = document.querySelectorAll('ytd-transcript-segment-renderer'); mode = 'old'; }

  const out = [];
  segs.forEach(s => {
    const t = mode === 'new'
      ? s.querySelector('.ytwTranscriptSegmentViewModelTimestamp')?.textContent?.trim()
      : s.querySelector('.segment-timestamp')?.textContent?.trim();
    const text = mode === 'new'
      ? s.querySelector('.ytAttributedStringHost')?.textContent?.trim()
      : s.querySelector('.segment-text')?.textContent?.trim();
    if (t && text) out.push({ t, text });
  });
  window.__cap = out; // stash for a follow-up JSON.stringify(window.__cap) call
})()
```

Known pitfall: the new-style timestamp element has a sibling `.ytwTranscriptSegmentViewModelTimestampA11yLabel` div ("0 segundo") that will concatenate into the timestamp text if you select the wrong node — target `.ytwTranscriptSegmentViewModelTimestamp` specifically.

### Video grid enumeration (for cataloguing a channel's videos)

`document.querySelectorAll('ytd-rich-item-renderer')`, each containing `a[href*="/watch?v="]` plus a title element (`#video-title, yt-formatted-string#video-title, h3` — try in that order, YouTube's DOM has changed which one is present over time).

To confirm a channel has no more videos to lazy-load (rather than a broken scroll trigger): check `document.documentElement.scrollHeight` stays small and no `ytd-continuation-item-renderer` spinner is present.

## Storage layout

```
Research/YouTube/<channel>/
  channel-index.jsonl       # one line: channel metadata
  video-index.tsv           # all videos catalogued (id, title, date, status...)
  _relevant.tsv             # keyword-filtered high-relevance subset (large channels only)
  transcripts-status.tsv    # supplementary tracker for newly-captured/confirmed-unavailable videos
                             # (used instead of rewriting a large existing video-index.tsv)
  transcripts/
    <videoId>.pt.json       # RAW: metadata header + segments[] ({t, text})
    <videoId>.pt.srt        # RAW, where captured via the older yt-dlp method
```

## Relevance classification (applied per video)

`HIGH` (server setup, system config, game mechanics, events, drops, maps, monsters, progression, items, commands, DB behavior, Season-specific detail, custom provider systems) / `MEDIUM` / `LOW` / `IRRELEVANT`. Every reviewed video keeps its catalog metadata regardless of relevance — only transcription effort is prioritized by relevance.

## When a transcript can't be captured

See [raw-capture.md](raw-capture.md)'s "when RAW can't be obtained" section and `knowledge/vendor-sweep/failure-manifest.json`. Never bypass platform restrictions; mark `NOT_AVAILABLE`, record the specific reason, and move to the next video — one blocked video never stops the sweep.

## Copyright

Transcript + metadata is sufficient; full video files are not mirrored unless separately justified. At most short, attributed quotes are ever reproduced from a transcript in derived documentation.
