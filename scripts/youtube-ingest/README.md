# YouTube knowledge-sweep ingestion pipeline

Automated, resumable, batch-capable replacement for manually watching the
browser transcript panel: official YouTube captions first, local ASR
fallback second. Built 2026-08-26/27 after the browser transcript-panel
method proved unreliable for a meaningful fraction of videos (a genuine
YouTube-side caption-delivery fault, diagnosed in earlier Knowledge Sweep
phases). This directory versions the pipeline's **source code only** --
runtime binaries, the embedded Python distribution, models, and any
downloaded audio/video are never committed here (see "What's NOT here").

## What's here

- `parse-vtt.mjs` -- parses YouTube's "rolling caption" auto-VTT format into
  clean `{t, text}` segments (the raw VTT repeats each line multiple times
  as it grows word-by-word; this collapses that into one clean segment per
  finished line).
- `ingest.mjs` -- the main batch pipeline: catalog -> official-caption
  attempt -> write transcript JSON -> update status. Resumable (skips
  anything already `CAPTURED`), bounded (`--limit`), rate-limited (delay
  between requests).
- `transcribe.py` -- local ASR via faster-whisper, for the audio fallback
  path (see "Pipeline stages" below).
- `finalize-asr-transcript.mjs` -- turns a raw `transcribe.py` output JSON
  into this project's standard transcript JSON shape (pipeline stage 2).
- `requirements.txt` -- the one Python dependency (`faster-whisper`) needed
  for the ASR fallback path only.
- `test/` -- fixture-based tests for the pure parsing/building logic above.
  No network access or runtime binaries required to run them.

## What's NOT here (install these yourself, they're gitignored)

- `bin/yt-dlp.exe`, `bin/ffmpeg.exe`/`ffprobe.exe` -- standalone binaries.
- `python/` -- an embeddable Python distribution with `faster-whisper`
  installed into it.
- Any downloaded audio, video, subtitle, or ASR model file.
- Any cookie file, browser profile, or authentication export.

## Reproducible install

Known-working versions from the environment this pipeline was built and
exercised against (2026-08-27, Windows) -- not strict requirements, just an
honest record so a fresh setup can sanity-check itself:

| Tool           | Version used                                | Notes                                                                                                                                                                             |
| -------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js        | v26.7.0                                     | Already required by the rest of this repo.                                                                                                                                        |
| yt-dlp         | 2026.08.19                                  | Download the standalone `yt-dlp.exe` release and place it at `./bin/yt-dlp.exe` (or point `YOUTUBE_INGEST_YTDLP_PATH` at it).                                                     |
| ffmpeg         | 9.0.1 (gyan.dev "essentials" Windows build) | Needed only for the audio-extraction fallback step; place `ffmpeg.exe`/`ffprobe.exe` under `./bin/` or pass `--ffmpeg-location` yourself when invoking yt-dlp for the audio step. |
| Python         | 3.11.9                                      | Any Python 3.11+ works; an embeddable distribution under `./python/` is one option, a regular venv is another.                                                                    |
| faster-whisper | 1.2.1                                       | `pip install -r requirements.txt`. Pulls in `ctranslate2`, `onnxruntime`, `tokenizers`, `huggingface_hub` automatically.                                                          |

Environment variables (both optional, both have sensible defaults):

- `YOUTUBE_INGEST_YTDLP_PATH` -- path to `yt-dlp.exe`. Default: `./bin/yt-dlp.exe` next to `ingest.mjs`.
- `YOUTUBE_INGEST_RESEARCH_ROOT` -- where per-channel transcript state (`_relevant.tsv`, `transcripts/`, `transcripts-raw-vtt/`, `transcripts-status.tsv`) lives. Default: a sibling `Research/YouTube` directory next to this repo's own root. These are large, per-machine research artifacts -- intentionally outside git, same as this repo's other `references/` raw-source material.

## Why `--js-runtimes node` matters

Without a JS runtime, yt-dlp falls back to YouTube's `visionos` client only,
which reports `UNPLAYABLE` for a meaningful fraction of videos it
shouldn't -- reproduced identically as the very first request of a fresh
run, so this is not a rate limit. Passing `--js-runtimes node` (Node.js is
already required by this repo) lets yt-dlp solve the challenge needed for
additional player-client fallbacks (`tv_downgraded`, `web_embedded`),
recovering the vast majority of those false negatives. This flag is baked
into `ingest.mjs` -- always pass it if calling yt-dlp directly too.

## No secret or cookie dependency

This pipeline authenticates as nothing and requires no credentials of any
kind. It fetches only publicly available captions/audio for public videos.
It does not read, store, or reference browser cookies, session exports, or
any browser-profile path. Members-only or otherwise access-restricted
content is expected to fail cleanly (`TRANSCRIPT_TRULY_UNAVAILABLE`) --
this pipeline has no bypass mechanism for that, by design, and none should
ever be added to it.

## Pipeline stages

1. **Official captions (primary)**: `ingest.mjs` calls
   `yt-dlp --js-runtimes node --write-auto-sub --sub-lang pt,pt-BR --sub-format vtt --write-info-json`,
   no video/audio download. If a `.vtt` file is produced, `parse-vtt.mjs`
   parses it and `ingest.mjs` writes the standard transcript JSON
   (`captionSource: "YouTube auto-generated"`).
2. **Audio + local ASR (fallback)**, used only when step 1 genuinely
   produces no subtitle file after retry:
   ```
   yt-dlp --js-runtimes node -f bestaudio --extract-audio --audio-format mp3 --ffmpeg-location bin -o <out> <url>
   python transcribe.py <audio.mp3> <out.asr.json> --model medium
   node finalize-asr-transcript.mjs --video-id <id> --channel "..." --channel-url "..." --title "..." --upload-date "..." --asr-json <out.asr.json> --out <transcripts-dir>/<id>.pt.json
   ```
   Then **delete the audio file** -- it is an ingestion intermediate, not a
   permanent artifact.

## ASR policy (honest status, do not overclaim)

`transcribe.py --model medium` is the tested, working default -- validated
against real Blood Moon tutorial audio, good accuracy/throughput balance
for Portuguese technical content on CPU-only hardware. `--model large-v3`
is a **conditional retry path for low-confidence results, not yet
validated at scale** -- it exists in the tool and should work, but has not
been exercised across a meaningful sample the way `medium` has. Do not
treat a `large-v3` run as more authoritative than this record supports
until it has actually been exercised and its results checked.

Confidence is classified HIGH/MEDIUM/LOW from `avg_logprob` and
`no_speech_prob` per segment (see `classify_confidence()` in
`transcribe.py`). LOW-confidence transcripts (`finalize-asr-transcript.mjs`
marks these `LOCAL_ASR_LOW_CONFIDENCE`) should not, by themselves, justify
promoting a claim to `BLOODMOON_CONFIRMED`. Per this project's confidence
pipeline more generally, even HIGH-confidence ASR is machine-generated
text, not an official caption -- it may inform `BLOODMOON_LIKELY`-tier
claims but must not alone justify `BLOODMOON_CONFIRMED` without
independent config/schema/runtime evidence.

## Never silently rewrite RAW ASR or captions

The transcript JSON's `segments[]` array is the verbatim ASR/caption
output. Any technical-vocabulary correction (e.g. an ASR mishearing
"event item beg" that should read "EventItemBag") belongs in a _separate_
normalized artifact with a note explaining the correspondence -- never
edited into the RAW segment text itself.

## Status vocabulary

`OFFICIAL_CAPTIONS_CAPTURED`, `OFFICIAL_CAPTIONS_UNAVAILABLE` (yt-dlp ran
clean but produced no subtitle file -- genuinely no captions),
`TRANSCRIPT_TRULY_UNAVAILABLE` (yt-dlp itself errored -- video removed,
private, or otherwise inaccessible; includes the specific case of
"members-only content", a real access restriction never bypassed),
`LOCAL_ASR_PENDING` / `LOCAL_ASR_PASS` / `LOCAL_ASR_LOW_CONFIDENCE`,
`AUDIO_UNAVAILABLE`.

## Testing

```
node test/run-tests.mjs
```

Runs entirely against small fixtures in `test/fixtures/` (a truncated real
VTT excerpt and a synthetic ASR JSON) -- no network access, no yt-dlp
binary, no Python, and no reprocessing of the real corpus required. This
proves the versioned source is correct; it deliberately does not exercise
`ingest.mjs`'s `main()`, which needs a real yt-dlp binary and network
access to do anything meaningful.

## Known limitation

Model downloads and CPU-only inference are slow on typical dev hardware
(no CUDA GPU -- integrated graphics only). A ~5-minute video took ~6
minutes to transcribe with the `medium` model after the one-time model
download. This pipeline was only exercised as a fallback for videos where
official captions were unavailable -- for the vast majority of the
YouTube corpus, official captions (fast, free, no local compute) resolved
everything.
