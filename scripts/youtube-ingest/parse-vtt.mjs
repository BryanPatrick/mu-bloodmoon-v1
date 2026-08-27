// Parses YouTube's "rolling caption" auto-generated VTT format into clean
// {t, text} segments matching this project's established transcript
// convention. YouTube's auto-VTT repeats each line multiple times as it
// "grows" word-by-word (with inline <HH:MM:SS.mmm><c>word</c> timing tags),
// so a naive per-cue extraction produces massive duplication. This parser
// tracks the growing line and only emits a segment once a line is complete
// (i.e., the next cue starts a genuinely new line rather than extending the
// current one), using the timestamp of the cue where that line first began.
import { readFileSync } from 'node:fs'

function stripTags(s) {
  return s
    .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
    .replace(/<\/?c>/g, '')
    .trim()
}

function tsToSeconds(ts) {
  const m = ts.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})/)
  if (!m) return 0
  return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000
}

function formatT(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function parseYouTubeAutoVtt(vttText) {
  const blocks = vttText
    .split(/\r?\n\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean)
  const cues = []
  for (const block of blocks) {
    const lines = block.split(/\r?\n/)
    const timeLine = lines.find((l) => l.includes('-->'))
    if (!timeLine) continue
    const [startRaw] = timeLine.split('-->')
    const start = tsToSeconds(startRaw.trim())
    const textLines = lines
      .slice(lines.indexOf(timeLine) + 1)
      .map(stripTags)
      .filter(Boolean)
    if (textLines.length === 0) continue
    // the last line in a cue is the most "grown" version of the current line
    cues.push({ start, text: textLines[textLines.length - 1] })
  }

  const segments = []
  let currentLine = null
  let currentStart = null
  for (const cue of cues) {
    if (currentLine === null) {
      currentLine = cue.text
      currentStart = cue.start
      continue
    }
    if (cue.text.startsWith(currentLine)) {
      // still growing the same line
      currentLine = cue.text
    } else {
      // a new line has started -- finalize the previous one
      if (currentLine) segments.push({ t: formatT(currentStart), text: currentLine })
      currentLine = cue.text
      currentStart = cue.start
    }
  }
  if (currentLine) segments.push({ t: formatT(currentStart), text: currentLine })

  // dedupe any exact-consecutive-duplicate segments (can happen at boundaries)
  const deduped = []
  for (const s of segments) {
    if (deduped.length && deduped[deduped.length - 1].text === s.text) continue
    deduped.push(s)
  }
  return deduped
}

// CLI mode: node parse-vtt.mjs <file.vtt>
if (process.argv[1] && process.argv[1].endsWith('parse-vtt.mjs') && process.argv[2]) {
  const text = readFileSync(process.argv[2], 'utf8')
  const segs = parseYouTubeAutoVtt(text)
  console.log(`Parsed ${segs.length} segments`)
  for (const s of segs.slice(0, 10)) console.log(`[${s.t}] ${s.text}`)
}
