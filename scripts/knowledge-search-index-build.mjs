#!/usr/bin/env node
// Knowledge Phase 10, Parts F/G -- builds a real, local, lexical search
// index over the Phase 7-10 knowledge/support corpus. This exists because
// Phase 9 found that knowledge-query.mjs (which only searches
// atomic-claims.json/knowledge-index.json) has zero visibility into the
// FAQ/Wiki/support markdown this project has actually built -- a player
// question with a real, written answer could return NOT_FOUND purely
// because the tool never looked at the file containing that answer.
//
// Design: chunk every indexed file by H2 (##) section (or the whole file
// if it has none), preserving full provenance per chunk (never flattened
// away, per Part G) -- documentId/documentType/title/section/text/
// aliases/keywords/entityRefs/claimRefs/verificationStatus/
// playerVisibility/sourcePath. No embeddings, no external service -- a
// lexical index with Portuguese-alias-aware tokenization and a
// visibility/tier classification is enough to answer "player asks in
// Portuguese, get the existing real answer," which is the actual
// requirement (Part H).
//
// playerVisibility is assigned per FILE by manifest (SOURCES below), with
// an in-file override for any H2 section whose heading or body explicitly
// marks it GM/ADMIN/INTERNAL_ONLY -- fails CLOSED (defaults to the more
// restrictive tier) whenever a section's own text signals it is not meant
// for players, even inside an otherwise player-facing file. This is the
// mechanism Part K's player-visibility filter depends on -- get this
// wrong and a GM command could leak into a player-mode search result, so
// every file in SOURCES was read and classified by hand, not guessed.
//
// Usage: node scripts/knowledge-search-index-build.mjs [--write]
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT_PATH = join(ROOT, 'knowledge', 'vendor-sweep', 'beta-readiness', 'search-index.json')

// File manifest: path (relative to repo root) -> { documentType, defaultVisibility, defaultVerification }
// defaultVisibility is used for every H2 chunk in the file UNLESS that
// chunk is individually flagged internal (see INTERNAL_SECTION_MARKERS).
const SOURCES = [
  // BLOCKED and formally superseded per phase9/wiki-release-candidates.md
  // ("Substituída nesta fase por Seus Primeiros 30 Minutos") -- kept
  // searchable for staff (HISTORICAL is allowed in support/admin mode)
  // but must not compete with its replacement in player-mode search.
  { path: 'knowledge/vendor-sweep/beta-readiness/wiki-drafts/comecando.md', documentType: 'wiki-draft-superseded', defaultVisibility: 'HISTORICAL', defaultVerification: 'PARTIAL' },
  { path: 'knowledge/vendor-sweep/beta-readiness/wiki-drafts/reset-master-reset.md', documentType: 'wiki-draft', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'READY_FOR_OPEN_BETA' },
  { path: 'knowledge/vendor-sweep/beta-readiness/wiki-drafts/eventos.md', documentType: 'wiki-draft', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'PARTIAL' },
  { path: 'knowledge/vendor-sweep/beta-readiness/wiki-drafts/comandos.md', documentType: 'wiki-draft', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'PARTIAL' },
  { path: 'knowledge/vendor-sweep/beta-readiness/wiki-drafts/economia-moedas.md', documentType: 'wiki-draft', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'PARTIAL' },
  { path: 'knowledge/vendor-sweep/beta-readiness/wiki-drafts/guilds.md', documentType: 'wiki-draft', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'READY_FOR_OPEN_BETA' },
  { path: 'knowledge/vendor-sweep/beta-readiness/wiki-drafts/market.md', documentType: 'wiki-draft', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'PARTIAL' },
  { path: 'knowledge/vendor-sweep/beta-readiness/wiki-drafts/rankings.md', documentType: 'wiki-draft', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'READY_FOR_OPEN_BETA' },
  { path: 'knowledge/vendor-sweep/beta-readiness/wiki-drafts/auction.md', documentType: 'wiki-draft', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'PARTIAL' },
  { path: 'knowledge/vendor-sweep/beta-readiness/wiki-drafts/glossario.md', documentType: 'glossary', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'PARTIAL' },
  { path: 'knowledge/vendor-sweep/beta-readiness/wiki-drafts/reportando-bugs.md', documentType: 'wiki-draft', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'PARTIAL' },
  // BLOCKED and formally superseded per phase9/wiki-release-candidates.md
  // ("Substituída nesta fase pelo FAQ completo") -- same treatment as
  // comecando.md above.
  { path: 'knowledge/vendor-sweep/beta-readiness/wiki-drafts/central-de-ajuda-faq.md', documentType: 'wiki-draft-superseded', defaultVisibility: 'HISTORICAL', defaultVerification: 'PARTIAL' },
  { path: 'knowledge/vendor-sweep/beta-readiness/phase9/faq-completo.md', documentType: 'faq', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'PARTIAL' },
  { path: 'knowledge/vendor-sweep/beta-readiness/phase9/seus-primeiros-30-minutos.md', documentType: 'onboarding-guide', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'PARTIAL' },
  { path: 'knowledge/vendor-sweep/beta-readiness/phase9/voltando-ao-mu.md', documentType: 'onboarding-guide', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'PARTIAL' },
  { path: 'knowledge/vendor-sweep/beta-readiness/phase9/command-center.md', documentType: 'command-guide', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'PARTIAL' },
  { path: 'knowledge/vendor-sweep/beta-readiness/phase9/bug-hunters-guia-final.md', documentType: 'wiki-draft', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'PARTIAL' },
  { path: 'knowledge/vendor-sweep/beta-readiness/phase9/checklist-o-que-testar.md', documentType: 'checklist', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'PARTIAL' },
  { path: 'knowledge/vendor-sweep/beta-readiness/phase9/open-beta-landing-copy.md', documentType: 'copy-draft', defaultVisibility: 'PUBLIC_PLAYER', defaultVerification: 'PARTIAL' },
  // Support/internal material -- never surfaced to a player-mode query.
  { path: 'knowledge/vendor-sweep/beta-readiness/support-runbook.md', documentType: 'support-runbook', defaultVisibility: 'SUPPORT_INTERNAL', defaultVerification: 'INTERNAL_VERIFIED' },
  { path: 'knowledge/vendor-sweep/beta-readiness/phase9/support-macros.md', documentType: 'support-macro', defaultVisibility: 'SUPPORT_INTERNAL', defaultVerification: 'INTERNAL_VERIFIED' },
  { path: 'knowledge/vendor-sweep/beta-readiness/event-support-faq.md', documentType: 'support-faq', defaultVisibility: 'SUPPORT_INTERNAL', defaultVerification: 'INTERNAL_VERIFIED' },
  { path: 'knowledge/vendor-sweep/beta-readiness/event-bug-routing.md', documentType: 'support-routing', defaultVisibility: 'SUPPORT_INTERNAL', defaultVerification: 'INTERNAL_VERIFIED' },
  { path: 'knowledge/vendor-sweep/beta-readiness/bug-report-template.md', documentType: 'support-template', defaultVisibility: 'SUPPORT_INTERNAL', defaultVerification: 'INTERNAL_VERIFIED' },
  { path: 'knowledge/vendor-sweep/beta-readiness/phase9/central-de-ajuda-arquitetura.md', documentType: 'help-center-ia', defaultVisibility: 'SUPPORT_INTERNAL', defaultVerification: 'INTERNAL_VERIFIED' },
  { path: 'knowledge/vendor-sweep/beta-readiness/phase9/policy-decisions-required.md', documentType: 'policy', defaultVisibility: 'ADMIN_INTERNAL', defaultVerification: 'INTERNAL_VERIFIED' },
  { path: 'knowledge/vendor-sweep/beta-readiness/policy-required-decisions.md', documentType: 'policy', defaultVisibility: 'ADMIN_INTERNAL', defaultVerification: 'INTERNAL_VERIFIED' },
  { path: 'knowledge/vendor-sweep/beta-readiness/participar-command-reconciliation.md', documentType: 'support-reference', defaultVisibility: 'SUPPORT_INTERNAL', defaultVerification: 'INTERNAL_VERIFIED' },
  { path: 'knowledge/vendor-sweep/beta-readiness/zombie-pandora-stopordie-deepdive.md', documentType: 'internal-deepdive', defaultVisibility: 'ADMIN_INTERNAL', defaultVerification: 'INTERNAL_VERIFIED' },
  { path: 'knowledge/vendor-sweep/beta-readiness/phase10/character-creation-findings.md', documentType: 'internal-findings', defaultVisibility: 'SUPPORT_INTERNAL', defaultVerification: 'INTERNAL_VERIFIED' },
  { path: 'knowledge/vendor-sweep/beta-readiness/phase10/classic-event-entry-findings.md', documentType: 'internal-findings', defaultVisibility: 'SUPPORT_INTERNAL', defaultVerification: 'INTERNAL_VERIFIED' },
  { path: 'knowledge/vendor-sweep/beta-readiness/phase10/email-activation-findings.md', documentType: 'internal-findings', defaultVisibility: 'SUPPORT_INTERNAL', defaultVerification: 'INTERNAL_VERIFIED' }
]

// A chunk whose heading OR body contains any of these (case-insensitive)
// is force-downgraded to ADMIN_INTERNAL regardless of the file's own
// default -- this is what keeps comandos.md's GM section and eventos.md's
// internal-only section out of player-mode results even though the rest
// of those same files is player-facing.
const INTERNAL_SECTION_MARKERS = [
  'internal_only',
  'gm_command',
  'gm-only',
  'admin/internal',
  'nunca publicar',
  'nunca expor',
  'never publish',
  'openevent',
  'never exposed to a player'
]

function walkSections(fileText) {
  // Split on H2 headings; keep the H1/preamble as its own leading chunk
  // (section: null) so file-level context is never lost.
  const lines = fileText.split(/\r?\n/)
  const sections = []
  let current = { heading: null, lines: [] }
  for (const line of lines) {
    const h2 = /^##\s+(.+)$/.exec(line)
    if (h2) {
      sections.push(current)
      current = { heading: h2[1].trim(), lines: [] }
    } else {
      current.lines.push(line)
    }
  }
  sections.push(current)
  return sections.filter((s) => s.lines.some((l) => l.trim().length > 0) || s.heading)
}

function extractTitle(fileText) {
  const h1 = /^#\s+(.+)$/m.exec(fileText)
  return h1 ? h1[1].trim() : null
}

function isInternalMarked(heading, text) {
  const haystack = `${heading || ''} ${text}`.toLowerCase()
  return INTERNAL_SECTION_MARKERS.some((m) => haystack.includes(m))
}

function extractRefs(text) {
  const claimRefs = [...new Set([...text.matchAll(/CLAIM-\d+/g)].map((m) => m[0]))]
  const entityRefs = [...new Set([...text.matchAll(/EVT-[a-z0-9-]+|EVENT-[a-z0-9-]+|SYS-[a-z0-9-]+|MAP-\d+|NPC-\d+/gi)].map((m) => m[0]))]
  return { claimRefs, entityRefs }
}

// Exported so knowledge-search-query.mjs applies the identical filter to
// query terms -- without this, a common interrogative word like "como"
// dominates scoring on every player question that starts with it.
export const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'que', 'para', 'com', 'em', 'no', 'na', 'nos', 'nas',
  'um', 'uma', 'uns', 'umas', 'se', 'por', 'não', 'nao', 'é', 'eh', 'ao', 'aos', 'mais', 'isso', 'esse', 'essa',
  'este', 'esta', 'sobre', 'como', 'quais', 'qual', 'quando', 'onde', 'quem', 'porque', 'posso', 'preciso',
  'quero', 'tem', 'ha', 'há', 'meu', 'minha', 'seu', 'sua', 'ja', 'já', 'ainda', 'muito', 'sao', 'são',
  // near-universal in this corpus (every doc is player-facing), so it
  // carries no discriminating power as a query term -- see Part L/M
  // "como denunciar um jogador" false-positive investigation
  'jogador', 'jogadores',
  // generic filler verbs that show up in almost every yes/no player
  // question ("Existe X?", "Posso X?") without naming the actual X --
  // see Part N "Existe ranking?"/"Existe 2FA?" false-positive investigation
  'existe', 'existem', 'posso', 'faco', 'faço',
  'the', 'and', 'of', 'to', 'in', 'is', 'a', 'do', 'does', 'how', 'what', 'is', 'are'
])

function extractKeywords(text) {
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents for keyword matching
    .replace(/[^a-z0-9\s/]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  return [...new Set(words)].slice(0, 60)
}

function buildIndex() {
  const chunks = []
  let skipped = 0
  for (const src of SOURCES) {
    const fullPath = join(ROOT, src.path)
    if (!existsSync(fullPath)) {
      console.warn(`SKIPPED (not found): ${src.path}`)
      skipped++
      continue
    }
    const text = readFileSync(fullPath, 'utf8')
    const title = extractTitle(text) || src.path
    const sections = walkSections(text)
    let idx = 0
    for (const s of sections) {
      const body = s.lines.join('\n').trim()
      if (!body && !s.heading) continue
      idx++
      const internal = isInternalMarked(s.heading, body)
      const visibility = internal
        ? src.defaultVisibility === 'PUBLIC_PLAYER'
          ? 'ADMIN_INTERNAL'
          : src.defaultVisibility
        : src.defaultVisibility
      const { claimRefs, entityRefs } = extractRefs(body)
      chunks.push({
        documentId: `${src.path}#${idx}`,
        documentType: src.documentType,
        title,
        section: s.heading,
        text: body,
        aliases: [],
        keywords: extractKeywords(`${title} ${s.heading || ''} ${body}`),
        entityRefs,
        claimRefs,
        verificationStatus: src.defaultVerification,
        playerVisibility: visibility,
        sourcePath: src.path
      })
    }
  }
  return { chunks, skipped }
}

// Guarded so other scripts (e.g. knowledge-search-query.mjs, which
// imports STOPWORDS below) can import this module without triggering a
// full rebuild + stdout output as a side effect of the import.
if (process.argv[1] && process.argv[1].endsWith('knowledge-search-index-build.mjs')) {
  const { chunks, skipped } = buildIndex()
  const shouldWrite = process.argv.includes('--write')
  const output = {
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/knowledge-search-index-build.mjs (Knowledge Phase 10, Parts F/G)',
    documentCount: SOURCES.length - skipped,
    chunkCount: chunks.length,
    chunks
  }

  if (shouldWrite) {
    writeFileSync(OUT_PATH, JSON.stringify(output, null, 2))
    console.log(`Wrote ${chunks.length} chunks from ${SOURCES.length - skipped} documents to ${OUT_PATH}`)
  } else {
    console.log(JSON.stringify({ documentCount: output.documentCount, chunkCount: output.chunkCount, skipped }, null, 2))
  }
}
