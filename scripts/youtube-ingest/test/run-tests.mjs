#!/usr/bin/env node
// Fixture-based tests for the YouTube ingestion pipeline's pure logic
// (parse-vtt.mjs, finalize-asr-transcript.mjs). Deliberately does NOT
// exercise ingest.mjs's main() -- that needs a real yt-dlp binary and
// network access, and this suite's job is to prove the versioned SOURCE is
// correct without reprocessing the real corpus. See README.md "Testing".
//
// Usage: node test/run-tests.mjs   (run from scripts/youtube-ingest/)
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { parseYouTubeAutoVtt } from '../parse-vtt.mjs'
import { buildAsrTranscriptJson } from '../finalize-asr-transcript.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(__dirname, 'fixtures')

let failures = 0
function check(name, fn) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
  } catch (e) {
    failures++
    console.log(`[FAIL] ${name}: ${e.message}`)
  }
}

check(
  "parseYouTubeAutoVtt collapses YouTube's rolling-caption duplication into one segment per finished line",
  () => {
    const vtt = readFileSync(join(FIXTURES, 'sample.vtt'), 'utf8')
    const segments = parseYouTubeAutoVtt(vtt)
    // The fixture's raw cues repeat each line 2-3 times as it "grows" --
    // a correct parse yields exactly 5 finished lines, not the 11 raw cues.
    if (segments.length !== 5)
      throw new Error(
        `expected 5 collapsed segments, got ${segments.length}: ${JSON.stringify(segments)}`
      )
    if (segments[0].text !== 'e aí galera beleza é estar mostrando')
      throw new Error(`unexpected first segment text: ${segments[0].text}`)
    if (segments[0].t !== '0:04')
      throw new Error(`expected first segment to start at 0:04, got ${segments[0].t}`)
    // The fixture is a truncated real excerpt -- its final cue block legitimately
    // carries two distinct lines ("...para a" then "gm"), so the parser correctly
    // emits them as two separate segments rather than one merged line.
    if (segments[3].text !== 'esse comando o pessoal é somente para a')
      throw new Error(`unexpected 4th segment text: ${segments[3].text}`)
    if (segments[4].text !== 'gm')
      throw new Error(`unexpected last segment text: ${segments[4].text}`)
  }
)

check(
  'parseYouTubeAutoVtt never leaves inline <c> tags or timing markers in the output text',
  () => {
    const vtt = readFileSync(join(FIXTURES, 'sample.vtt'), 'utf8')
    const segments = parseYouTubeAutoVtt(vtt)
    for (const s of segments) {
      if (/<c>|<\/c>|<\d{2}:\d{2}:\d{2}\.\d{3}>/.test(s.text))
        throw new Error(`leaked tag/timing marker in segment: ${s.text}`)
    }
  }
)

check('parse-vtt.mjs CLI mode runs against the fixture without error', () => {
  const out = execFileSync(
    'node',
    [join(__dirname, '..', 'parse-vtt.mjs'), join(FIXTURES, 'sample.vtt')],
    { encoding: 'utf8' }
  )
  if (!out.includes('Parsed 5 segments')) throw new Error(`unexpected CLI output: ${out}`)
})

check('buildAsrTranscriptJson produces the standard transcript shape from a raw ASR JSON', () => {
  const asr = JSON.parse(readFileSync(join(FIXTURES, 'sample.asr.json'), 'utf8'))
  const transcript = buildAsrTranscriptJson(asr, {
    videoId: 'FIXTURE01',
    channel: 'Test Channel',
    channelUrl: 'https://www.youtube.com/@test',
    title: 'Fixture Video',
    uploadDate: '2026'
  })
  if (transcript.captionSource !== 'LOCAL_ASR')
    throw new Error('captionSource must be LOCAL_ASR for the ASR path')
  if (transcript.transcriptStatus !== 'LOCAL_ASR_PASS')
    throw new Error(
      `expected LOCAL_ASR_PASS for HIGH confidence, got ${transcript.transcriptStatus}`
    )
  if (transcript.segmentCount !== 2)
    throw new Error(`expected 2 segments, got ${transcript.segmentCount}`)
  if (transcript.segments[0].t !== '0:00')
    throw new Error(`expected first segment at 0:00, got ${transcript.segments[0].t}`)
  if (!transcript.normalizationNote.includes('RAW ASR text is preserved verbatim'))
    throw new Error('missing the never-silently-rewrite-RAW-ASR note')
})

check(
  'buildAsrTranscriptJson downgrades transcriptStatus for LOW-confidence ASR (never silently promoted)',
  () => {
    const asr = JSON.parse(readFileSync(join(FIXTURES, 'sample.asr.json'), 'utf8'))
    const lowConfidenceAsr = { ...asr, confidenceClassification: 'LOW' }
    const transcript = buildAsrTranscriptJson(lowConfidenceAsr, {
      videoId: 'FIXTURE02',
      channel: 'Test Channel',
      channelUrl: 'https://www.youtube.com/@test',
      title: 'Fixture Video',
      uploadDate: '2026'
    })
    if (transcript.transcriptStatus !== 'LOCAL_ASR_LOW_CONFIDENCE')
      throw new Error(`expected LOCAL_ASR_LOW_CONFIDENCE, got ${transcript.transcriptStatus}`)
  }
)

check('finalize-asr-transcript.mjs CLI mode writes a real file end-to-end', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'youtube-ingest-test-'))
  const outPath = join(tmpDir, 'FIXTURE03.pt.json')
  try {
    execFileSync(
      'node',
      [
        join(__dirname, '..', 'finalize-asr-transcript.mjs'),
        '--video-id',
        'FIXTURE03',
        '--channel',
        'Test Channel',
        '--channel-url',
        'https://www.youtube.com/@test',
        '--title',
        'Fixture Video',
        '--upload-date',
        '2026',
        '--asr-json',
        join(FIXTURES, 'sample.asr.json'),
        '--out',
        outPath
      ],
      { encoding: 'utf8' }
    )
    if (!existsSync(outPath)) throw new Error('CLI did not write the expected output file')
    const written = JSON.parse(readFileSync(outPath, 'utf8'))
    if (written.videoId !== 'FIXTURE03') throw new Error('written file has wrong videoId')
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

console.log(
  failures === 0
    ? '\nAll youtube-ingest fixture tests passed.'
    : `\n${failures} youtube-ingest fixture test(s) FAILED.`
)
process.exit(failures === 0 ? 0 : 1)
