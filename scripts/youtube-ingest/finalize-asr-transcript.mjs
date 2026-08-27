#!/usr/bin/env node
// Pipeline stage 2 (audio + local ASR fallback, see README.md): turns a raw
// transcribe.py output JSON into this project's standard transcript.pt.json
// shape. Used only for videos where fetchOfficialCaptions() (ingest.mjs)
// genuinely produced no subtitle file after retry -- the vast majority of
// the corpus resolves via official captions and never reaches this script.
//
// Generalizes two prior one-off, hardcoded-path scripts (build-asr-
// transcript.mjs, used for pPhK9sEABq4) into a reusable CLI so this stage is
// actually runnable/testable rather than copy-pasted per video.
//
// Usage:
//   node finalize-asr-transcript.mjs \
//     --video-id pPhK9sEABq4 \
//     --channel "ProjectGamers Developers" \
//     --channel-url https://www.youtube.com/@projectgamersoficial \
//     --title "Custom OffAttack - UPDATED 5.8" \
//     --upload-date 2021 \
//     --asr-json path/to/pPhK9sEABq4.asr.json \
//     --out path/to/pPhK9sEABq4.pt.json \
//     [--capture-method "..."] [--classification-note "..."]
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

function formatT(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const DEFAULT_CAPTURE_METHOD =
  "LOCAL ASR (faster-whisper) -- used only when official YouTube captions were confirmed unavailable after retry. Audio was extracted via yt-dlp (bestaudio, no video), transcribed locally, and the source audio then deleted per this project's audio-retention policy (audio is an ingestion intermediate, not a permanent artifact)."

const DEFAULT_NORMALIZATION_NOTE =
  'RAW ASR text is preserved verbatim below, unmodified. Any technical-vocabulary normalization belongs in a SEPARATE normalized artifact, never silently applied to this RAW segment text.'

export function buildAsrTranscriptJson(asr, meta) {
  const {
    videoId,
    channel,
    channelUrl,
    title,
    uploadDate,
    captureMethod = DEFAULT_CAPTURE_METHOD,
    normalizationNote = DEFAULT_NORMALIZATION_NOTE
  } = meta
  return {
    videoId,
    channel,
    channelUrl,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title,
    uploadDate,
    captureMethod,
    capturedAtUtc: new Date().toISOString(),
    language: 'pt-BR',
    captionSource: 'LOCAL_ASR',
    transcriptStatus:
      asr.confidenceClassification === 'LOW' ? 'LOCAL_ASR_LOW_CONFIDENCE' : 'LOCAL_ASR_PASS',
    asr: {
      engine: asr.asrEngine,
      model: asr.asrModel,
      detectedLanguage: asr.detectedLanguage,
      languageProbability: asr.languageProbability,
      audioDurationSec: asr.audioDurationSec,
      transcribeTimeSec: asr.transcribeTimeSec,
      processingRatio: asr.processingRatio,
      confidenceClassification: asr.confidenceClassification
    },
    transcriptQuality: `LOCAL_ASR_${asr.confidenceClassification} -- this is machine-generated ASR text, not an official YouTube caption. Per this project's confidence pipeline, HIGH-confidence ASR may inform BLOODMOON_LIKELY-tier claims but must not alone justify BLOODMOON_CONFIRMED without independent config/schema/runtime evidence.`,
    normalizationNote,
    segmentCount: asr.segments.length,
    segments: asr.segments.map((s) => ({
      t: formatT(s.start),
      text: s.text,
      avgLogprob: s.avg_logprob,
      noSpeechProb: s.no_speech_prob
    }))
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--video-id') out.videoId = args[++i]
    else if (a === '--channel') out.channel = args[++i]
    else if (a === '--channel-url') out.channelUrl = args[++i]
    else if (a === '--title') out.title = args[++i]
    else if (a === '--upload-date') out.uploadDate = args[++i]
    else if (a === '--asr-json') out.asrJsonPath = args[++i]
    else if (a === '--out') out.outPath = args[++i]
    else if (a === '--capture-method') out.captureMethod = args[++i]
    else if (a === '--classification-note') out.classificationNote = args[++i]
  }
  const required = ['videoId', 'channel', 'channelUrl', 'title', 'asrJsonPath', 'outPath']
  const missing = required.filter((k) => !out[k])
  if (missing.length) {
    console.error(
      `Missing required args: ${missing.map((k) => '--' + k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())).join(', ')}`
    )
    process.exit(1)
  }
  return out
}

function main() {
  const opts = parseArgs()
  const asr = JSON.parse(readFileSync(opts.asrJsonPath, 'utf8'))
  const transcript = buildAsrTranscriptJson(asr, opts)
  if (opts.classificationNote) transcript.classificationNote = opts.classificationNote
  writeFileSync(opts.outPath, JSON.stringify(transcript, null, 2))
  console.log(`Wrote ${transcript.segmentCount} ASR segments to ${opts.outPath}`)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main()
}
