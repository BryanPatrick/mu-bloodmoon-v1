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

## Capture methods, in priority order

### 1. Official captions via yt-dlp (current primary method)

`D:\MU\Tools\YtDlpAsr\ingest.mjs` (see its own `README.md`) — a resumable, batch-capable pipeline: `yt-dlp --js-runtimes node --write-auto-sub --sub-lang pt,pt-BR --sub-format vtt`, no video/audio download, then a custom VTT parser (`parse-vtt.mjs`, handles YouTube's rolling-caption duplication) produces the standard transcript JSON.

**Why `--js-runtimes node` matters**: without it, yt-dlp falls back to the `visionos` client only, which reports videos `UNPLAYABLE` for a meaningful fraction of the catalog that are actually fine — reproduced identically as the very first request of a fresh run, so it is not rate-limiting. Passing `--js-runtimes node` (Node.js is already present in this environment) unlocks additional player-client fallbacks (`tv_downgraded`, `web_embedded`) that resolve the vast majority of those false negatives. This single flag took a batch from 50% failure to ~97% success.

This method single-handedly closed out the entire remaining backlog in one session: 108/108 `project-gamers-oficial` relevant videos and 2 of 3 `EuSanTiago` videos, most of which the browser method below had been unable to reach (see "why the earlier methods struggled" below).

### 2. Local ASR fallback (faster-whisper), for genuinely caption-less videos

When step 1 produces no subtitle file after retry, extract audio only (`yt-dlp -f bestaudio --extract-audio`, no video download) and transcribe locally with `faster-whisper` (CPU, `medium` model by default, `large-v3` for low-confidence retries). The audio file is deleted immediately after a successful transcription — it is an ingestion intermediate, not a permanent artifact; only the transcript JSON (with per-segment `avg_logprob`/`no_speech_prob` as a confidence proxy) is kept. See `Tools/YtDlpAsr/README.md` for the full pipeline and model-selection rationale.

Used exactly once so far, for `pPhK9sEABq4` ("Custom OffAttack"), a video confirmed by three independent methods (browser panel: no button; yt-dlp official captions: unavailable, twice, before and after the `--js-runtimes` fix) to have no official captions of any kind. Recovered a HIGH-confidence, coherent transcript in ~6 minutes of CPU time for a ~5-minute video.

### 3. Real browser automation (superseded as primary, kept as a documented fallback)

Drives YouTube's own "Mostrar transcrição" (Show transcript) UI feature via `mcp__Claude_Browser__javascript_tool`. Was the primary method through Phase 2/3 of this sweep, and worked for most videos it was tried on, but had two real limitations method 1 doesn't share: (a) it requires one interactive turn per video (slow, not batchable), and (b) it genuinely got stuck (panel stays on a loading spinner indefinitely) on a real subset of videos where the official caption track is registered but its content-delivery is broken through the browser's rendering path specifically — the same videos succeeded immediately via yt-dlp's direct API-level fetch. Kept documented below since it remains a legitimate fallback if yt-dlp itself is ever blocked again.

### Working browser extraction pattern

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
  transcripts-status.tsv    # append-log tracker (videoId, title, status, file, method, timestamp,
                             # classification, notes) -- rows are appended, not overwritten, so a
                             # video's capture history (e.g. "browser: stuck" then "yt-dlp: captured")
                             # stays visible; latest row per videoId wins for resumability checks.
  transcripts-raw-vtt/      # raw .vtt + .info.json exactly as yt-dlp wrote them, kept as the
                             # official-caption RAW artifact
  transcripts/
    <videoId>.pt.json       # the project's normalized-shape transcript: metadata header + segments[]
                             # ({t, text}), regardless of which of the 3 methods produced it -- the
                             # captureMethod/captionSource/transcriptQuality fields record provenance
    <videoId>.pt.srt        # RAW, where captured via the original (now-superseded) yt-dlp attempt early in the project
```

Local ASR intermediates (audio files) are NOT kept in `Research/` — they live briefly under `Tools/YtDlpAsr/temp-audio/` and are deleted after a successful transcription. Only the resulting `.asr.json` (per-segment text + confidence) and the final `transcripts/<videoId>.pt.json` are permanent.

## Status vocabulary

`OFFICIAL_CAPTIONS_CAPTURED`, `OFFICIAL_CAPTIONS_UNAVAILABLE` (yt-dlp ran clean, no subtitle track exists), `TRANSCRIPT_TRULY_UNAVAILABLE` (yt-dlp itself errored — video removed/private/members-only), `LOCAL_ASR_PENDING` / `LOCAL_ASR_PASS` / `LOCAL_ASR_LOW_CONFIDENCE`, `AUDIO_UNAVAILABLE`. `NO_CAPTIONS` is never treated as automatically equivalent to "give up" — it routes to the audio fallback before being called truly unavailable.

## Relevance classification (applied per video)

`HIGH` (server setup, system config, game mechanics, events, drops, maps, monsters, progression, items, commands, DB behavior, Season-specific detail, custom provider systems) / `MEDIUM` / `LOW` / `IRRELEVANT`. Every reviewed video keeps its catalog metadata regardless of relevance — only transcription effort is prioritized by relevance.

## When a transcript can't be captured

See [raw-capture.md](raw-capture.md)'s "when RAW can't be obtained" section and `knowledge/vendor-sweep/failure-manifest.json`. Never bypass platform restrictions — a "members-only content" error from yt-dlp is a genuine access restriction (a channel-membership paywall) and is recorded as such, never worked around. Mark the specific status, record the reason, and move to the next video — one blocked video never stops the sweep.

## Copyright

Transcript + metadata is sufficient; full video files are not mirrored unless separately justified. At most short, attributed quotes are ever reproduced from a transcript in derived documentation.
