#!/usr/bin/env node
// Knowledge Sweep YouTube ingestion pipeline (Priority 1: official captions
// via yt-dlp, bypassing the browser transcript-panel UI entirely).
//
// Pipeline per video: yt-dlp fetch (official auto-caption VTT, no video/audio
// download) -> parse-vtt.mjs -> write transcripts/<id>.pt.json in this
// project's established format -> update transcripts-status.tsv.
//
// Resumable: re-running skips any videoId already CAPTURED in
// transcripts-status.tsv. Bounded: processes at most --limit videos per run
// (default 8), with a delay between requests to stay a well-behaved client.
//
// Runtime dependencies (yt-dlp.exe, ffmpeg) are NOT versioned in this repo --
// see README.md in this directory for install instructions. This script
// expects yt-dlp at YOUTUBE_INGEST_YTDLP_PATH (default: ./bin/yt-dlp.exe,
// relative to this file -- gitignored, install it yourself) and writes/reads
// transcript state under YOUTUBE_INGEST_RESEARCH_ROOT (default: ../../../Research/YouTube,
// i.e. a sibling "Research" directory next to this repo's own root -- also
// outside git, by design: raw provider transcripts are large, per-machine
// research artifacts, not repo content).
//
// Usage:
//   node ingest.mjs --channel project-gamers-oficial --limit 10
//   node ingest.mjs --channel project-gamers-oficial --video-id A2BcRITQjxc
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseYouTubeAutoVtt } from './parse-vtt.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const YTDLP = process.env.YOUTUBE_INGEST_YTDLP_PATH || join(__dirname, 'bin', 'yt-dlp.exe')
const RESEARCH_ROOT =
  process.env.YOUTUBE_INGEST_RESEARCH_ROOT ||
  resolve(__dirname, '..', '..', '..', 'Research', 'YouTube')

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { limit: 8, delayMs: 4000 }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--channel') out.channel = args[++i]
    else if (args[i] === '--limit') out.limit = parseInt(args[++i], 10)
    else if (args[i] === '--video-id') out.videoId = args[++i]
    else if (args[i] === '--delay-ms') out.delayMs = parseInt(args[++i], 10)
  }
  return out
}

function readTsv(path) {
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean)
}

function loadRelevantVideos(channelDir) {
  const path = join(channelDir, '_relevant.tsv')
  const rows = readTsv(path)
  return rows.map((row) => {
    const [idxvid, title] = row.split('\t')
    const videoId = idxvid.includes(':') ? idxvid.split(':')[1] : idxvid
    return { videoId, title }
  })
}

function loadStatus(channelDir) {
  const path = join(channelDir, 'transcripts-status.tsv')
  const rows = readTsv(path)
  const map = new Map()
  for (const row of rows.slice(1)) {
    const cols = row.split('\t')
    if (cols[0]) map.set(cols[0], cols[2])
  }
  return map
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchOfficialCaptions(videoId, outDir) {
  mkdirSync(outDir, { recursive: true })
  const outTemplate = join(outDir, '%(id)s.%(ext)s')
  let stderr = ''
  let exitOk = true
  try {
    execFileSync(
      YTDLP,
      [
        '--js-runtimes',
        'node', // without this, yt-dlp falls back to the 'visionos' client only, which
        // returns UNPLAYABLE for many videos it shouldn't -- Node (already present in this environment)
        // lets it solve the challenge needed for additional player clients (web_embedded, etc.) and
        // recovers a large fraction of what would otherwise misreport as "video not available"
        '--skip-download',
        '--write-auto-sub',
        '--write-sub',
        '--sub-lang',
        'pt,pt-BR',
        '--sub-format',
        'vtt',
        '--write-info-json',
        '--no-warnings',
        '-o',
        outTemplate,
        `https://www.youtube.com/watch?v=${videoId}`
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    )
  } catch (e) {
    exitOk = false
    stderr = (e.stderr || e.message || '').toString()
  }

  const vttPath = join(outDir, `${videoId}.pt.vtt`)
  const vttPathAlt = join(outDir, `${videoId}.pt-BR.vtt`)
  const infoPath = join(outDir, `${videoId}.info.json`)
  const realVttPath = existsSync(vttPath) ? vttPath : existsSync(vttPathAlt) ? vttPathAlt : null

  if (realVttPath) {
    let meta = {}
    if (existsSync(infoPath)) {
      try {
        meta = JSON.parse(readFileSync(infoPath, 'utf8'))
      } catch {
        /* ignore */
      }
    }
    return {
      status: 'OFFICIAL_CAPTIONS_CAPTURED',
      vttPath: realVttPath,
      infoPath: existsSync(infoPath) ? infoPath : null,
      meta
    }
  }

  if (!exitOk && /not available|Private video|has been removed|unavailable/i.test(stderr)) {
    return {
      status: 'TRANSCRIPT_TRULY_UNAVAILABLE',
      reason: stderr.split('\n').find((l) => /ERROR/i.test(l)) || stderr.slice(0, 300)
    }
  }
  return {
    status: 'OFFICIAL_CAPTIONS_UNAVAILABLE',
    reason: stderr.slice(0, 300) || 'no subtitle file produced'
  }
}

export function buildTranscriptJson(videoId, channel, channelUrl, title, result) {
  const vttText = readFileSync(result.vttPath, 'utf8')
  const segments = parseYouTubeAutoVtt(vttText)
  const uploadDate = result.meta?.upload_date
    ? `${result.meta.upload_date.slice(0, 4)}-${result.meta.upload_date.slice(4, 6)}-${result.meta.upload_date.slice(6, 8)}`
    : null
  return {
    videoId,
    channel,
    channelUrl,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: result.meta?.title || title,
    uploadDate,
    captureMethod:
      'yt-dlp official auto-caption fetch (--write-auto-sub), bypasses the browser transcript-panel UI entirely',
    capturedAtUtc: new Date().toISOString(),
    language: 'pt-BR',
    captionSource: 'YouTube auto-generated (ASR by YouTube, not this project)',
    transcriptQuality:
      'OFFICIAL -- not locally-generated ASR, so no local confidence score applies',
    segmentCount: segments.length,
    segments
  }
}

async function main() {
  const opts = parseArgs()
  if (!opts.channel) {
    console.error('Usage: node ingest.mjs --channel <name> [--limit N] [--video-id ID]')
    process.exit(1)
  }
  const channelDir = join(RESEARCH_ROOT, opts.channel)
  const transcriptsDir = join(channelDir, 'transcripts')
  const rawVttDir = join(channelDir, 'transcripts-raw-vtt')
  const statusPath = join(channelDir, 'transcripts-status.tsv')
  mkdirSync(transcriptsDir, { recursive: true })

  const relevant = loadRelevantVideos(channelDir)
  const status = loadStatus(channelDir)
  const channelUrl = `https://www.youtube.com/@${opts.channel === 'project-gamers-oficial' ? 'projectgamersoficial' : opts.channel}`
  const channelName =
    opts.channel === 'project-gamers-oficial' ? 'ProjectGamers Developers' : opts.channel

  let pending = opts.videoId
    ? relevant.filter((v) => v.videoId === opts.videoId)
    : relevant.filter(
        (v) =>
          !status.has(v.videoId) ||
          !['CAPTURED', 'AVAILABLE_CAPTURED'].includes(status.get(v.videoId))
      )
  pending = pending.slice(0, opts.limit)

  console.log(
    `${pending.length} video(s) to attempt this run (of ${relevant.length} total relevant, ${status.size} already tracked)\n`
  )

  const results = []
  for (const v of pending) {
    process.stdout.write(`[${v.videoId}] ${v.title} ... `)
    const r = await fetchOfficialCaptions(v.videoId, rawVttDir)
    if (r.status === 'OFFICIAL_CAPTIONS_CAPTURED') {
      const transcript = buildTranscriptJson(v.videoId, channelName, channelUrl, v.title, r)
      writeFileSync(
        join(transcriptsDir, `${v.videoId}.pt.json`),
        JSON.stringify(transcript, null, 2)
      )
      console.log(`CAPTURED (${transcript.segmentCount} segments)`)
    } else {
      console.log(r.status)
    }
    results.push({ videoId: v.videoId, title: v.title, ...r })
    await sleep(opts.delayMs)
  }

  // append to status tsv -- MUST match the existing 8-column schema exactly:
  // videoId, title, transcriptStatus, transcriptFile, captureMethod, capturedAtUtc, classification, notes
  const needsHeader = !existsSync(statusPath)
  if (needsHeader) {
    writeFileSync(
      statusPath,
      'videoId\ttitle\ttranscriptStatus\ttranscriptFile\tcaptureMethod\tcapturedAtUtc\tclassification\tnotes\n'
    )
  }
  const nowIso = new Date().toISOString()
  for (const r of results) {
    const line = [
      r.videoId,
      r.title,
      r.status === 'OFFICIAL_CAPTIONS_CAPTURED' ? 'CAPTURED' : r.status,
      r.status === 'OFFICIAL_CAPTIONS_CAPTURED' ? `transcripts/${r.videoId}.pt.json` : '(none)',
      'yt-dlp official auto-caption fetch',
      nowIso,
      'UNCLASSIFIED', // relevance/BloodMoon-status classification happens at normalization time, not capture time
      r.status === 'OFFICIAL_CAPTIONS_CAPTURED'
        ? `${r.status}`
        : (r.reason || '').replace(/\t/g, ' ').replace(/\n/g, ' | ').slice(0, 200)
    ].join('\t')
    appendFileSync(statusPath, line + '\n')
  }

  const summary = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})
  console.log('\nBatch summary:', JSON.stringify(summary, null, 2))
}

// Only run the network-dependent pipeline when invoked directly -- importing
// buildTranscriptJson/parseYouTubeAutoVtt for tests must not trigger a live run.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main()
}
