#!/usr/bin/env node
// Knowledge Phase 10, Parts H/I/J/K -- query engine over the search index
// built by knowledge-search-index-build.mjs. Lexical scoring (no
// embeddings, no external service, per Part H) with:
//   - Portuguese player-language alias normalization (Part I)
//   - tier-based ranking so READY_FOR_OPEN_BETA / player-facing confirmed
//     material outranks provider-only/internal material (Part J)
//   - a hard player-visibility filter that NEVER returns
//     SUPPORT_INTERNAL/ADMIN_INTERNAL/HISTORICAL/PROVIDER_SOURCE chunks in
//     player mode, regardless of lexical score (Part K) -- this filter
//     runs BEFORE scoring, not as a post-hoc sort, so a highly-relevant
//     internal chunk can never "win" its way past the filter
//
// Usage:
//   node scripts/knowledge-search-query.mjs "<query>" [--mode=player|support|admin] [--limit=5]
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { STOPWORDS } from './knowledge-search-index-build.mjs'

const ROOT = process.cwd()
const INDEX_PATH = join(ROOT, 'knowledge', 'vendor-sweep', 'beta-readiness', 'search-index.json')

// Part I: player-language aliases. Each key normalizes to every value in
// its array (bidirectional -- searching any one finds chunks containing
// any other). Deliberately narrow and hand-curated, not a generic
// stemmer -- Part I explicitly warns against inventing false semantic
// equivalences, so every entry here is a genuine abbreviation/spelling
// variant a real player would type, not a loose synonym.
const ALIAS_GROUPS = [
  ['reseta', 'resetar', 'reset', 'dar reset'],
  ['mr', 'master reset', 'masterreset'],
  ['bc', 'blood castle'],
  ['cc', 'chaos castle'],
  ['ds', 'devil square'],
  ['it', 'illusion temple'],
  ['participar', '/participar', 'participa'],
  ['email', 'e-mail'],
  ['ativar conta', 'confirmar email', 'confirmar e-mail', 'ativacao', 'ativação'],
  ['criar char', 'criar personagem', 'criacao de personagem', 'criação de personagem'],
  // same verb, grammatical-form variants (create / creation / creating)
  // -- not a new semantic equivalence, just morphology substring-matching
  // can't bridge on its own
  ['criar', 'criação', 'criacao', 'criando'],
  ['classe', 'classes'],
  ['logar', 'login', 'entrar no jogo'],
  ['launcher', 'lancador']
]

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function buildAliasIndex() {
  const map = new Map()
  for (const group of ALIAS_GROUPS) {
    const norm = group.map((g) => stripAccents(g.toLowerCase()))
    for (const term of norm) map.set(term, norm)
  }
  return map
}
const ALIAS_INDEX = buildAliasIndex()

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function expandQueryTerms(query) {
  const raw = stripAccents(query.toLowerCase())
  // alias-phrase detection runs on the full unfiltered query, since a
  // stopword can be part of a meaningful phrase (e.g. removing "de"
  // shouldn't break phrase lookup). Word-boundary matched, not a plain
  // substring check -- a short 2-letter code like "it" (Illusion Temple)
  // or "bc" (Blood Castle) otherwise matches inside ordinary words
  // ("item", "gratuito", "objetivo") and silently injects an unrelated
  // alias ("illusion temple") into completely unrelated queries. Found
  // via the Part O escalation-router investigation of "posso vender item
  // por dinheiro real" scoring reset-master-reset.md as a confident
  // match purely because "item" contains "it".
  const aliasHits = new Set()
  for (const [phrase, group] of ALIAS_INDEX) {
    const pattern = new RegExp(`\\b${escapeRegex(phrase)}\\b`)
    if (pattern.test(raw)) for (const alt of group) aliasHits.add(alt)
  }

  // content terms: same stopword filter the indexer applies to keywords,
  // so a common interrogative word ("como", "quais"...) never dominates
  // scoring the way "não" did before this filter existed. Punctuation is
  // stripped before splitting (mirroring the indexer's own keyword
  // extraction) -- without this, a term like "2fa?" or "gratuito?" keeps
  // its trailing "?" and can never match the same word appearing
  // unpunctuated in body text, silently producing zero hits for that
  // concept on any question ending in "?" (i.e. nearly every real query).
  const words = raw
    .replace(/[^a-z0-9\s/]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOPWORDS.has(w))
  // baseConceptCount deliberately does NOT grow with alias expansion --
  // it's the number of distinct concepts the player actually typed.
  // Using the post-expansion term count for relevance thresholds would
  // mean adding more aliases makes matching STRICTER (a bigger
  // denominator), which defeats the point of having aliases at all.
  const baseConceptCount = new Set(words).size || 1

  const expanded = new Set([...words, ...aliasHits])
  for (const w of [...expanded]) {
    const group = ALIAS_INDEX.get(w)
    if (group) for (const alt of group) expanded.add(alt)
  }
  return { terms: [...expanded], baseConceptCount }
}

// Part J: tier ranking. Higher = ranked higher when relevance is otherwise
// comparable.
const TIER_WEIGHT = {
  READY_FOR_OPEN_BETA: 5,
  BLOODMOON_CONFIRMED: 4,
  PARTIAL: 3,
  INTERNAL_VERIFIED: 2,
  PROVIDER_LIKELY: 1,
  UNKNOWN: 0.5
}

const VISIBILITY_ALLOWED = {
  player: new Set(['PUBLIC_PLAYER']),
  support: new Set(['PUBLIC_PLAYER', 'SUPPORT_INTERNAL', 'HISTORICAL', 'PROVIDER_SOURCE']),
  admin: new Set(['PUBLIC_PLAYER', 'SUPPORT_INTERNAL', 'ADMIN_INTERNAL', 'HISTORICAL', 'PROVIDER_SOURCE'])
}

// Small section-level quality signal, additive to the doc-level tier
// weight above. The corpus already self-labels sections with these exact
// markers (see e.g. reset-master-reset.md's "CURRENT_REAL_STATE" vs
// "FUTURE_DESIGN / RECOMMENDATION" headings) -- this reuses that existing
// convention rather than inventing a new one, so a query like "como
// resetar" ranks the confirmed how-to-do-it section above a nearby
// not-yet-confirmed/speculative section in the SAME document, instead of
// term-overlap alone deciding it. Deliberately small relative to the
// headingHits*5 term-match bonus so real relevance differences still win.
const CONFIRMED_SECTION_MARKERS = ['current_real_state', 'o que está confirmado', 'ativo hoje', 'confirmado que']
const SPECULATIVE_SECTION_MARKERS = [
  'future_design',
  'recommendation',
  'o que não está confirmado',
  'needs_gameplay_validation',
  'desativados hoje',
  'unknown'
]
function sectionQualityBonus(section) {
  if (!section) return 0
  const s = stripAccents(section.toLowerCase())
  if (CONFIRMED_SECTION_MARKERS.some((m) => s.includes(m))) return 3
  if (SPECULATIVE_SECTION_MARKERS.some((m) => s.includes(m))) return -3
  return 0
}

// A task-checklist chunk ("- [ ] Criar um personagem.") can share exact
// keywords with an informational query ("como criar personagem") while
// being a poor answer to it -- it's a to-do prompt, not an explanation.
// Applied by documentType (structural, from the SOURCES manifest), not
// by content sniffing, so it generalizes to any query rather than
// targeting one case.
const DOCUMENT_TYPE_PENALTY = { checklist: -4 }
function documentTypePenalty(documentType) {
  return DOCUMENT_TYPE_PENALTY[documentType] ?? 0
}

export function search(query, { mode = 'player', limit = 5 } = {}) {
  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'))
  const allowed = VISIBILITY_ALLOWED[mode]
  if (!allowed) throw new Error(`Unknown mode '${mode}' -- expected player|support|admin`)

  const { terms, baseConceptCount } = expandQueryTerms(query)
  const scored = []
  for (const chunk of index.chunks) {
    // Part K: the visibility filter runs FIRST, before any scoring --
    // an internal chunk is never a candidate in player mode no matter how
    // well it matches.
    if (!allowed.has(chunk.playerVisibility)) continue

    const haystack = stripAccents(`${chunk.title} ${chunk.section || ''} ${chunk.text}`.toLowerCase())
    let hits = 0
    for (const t of terms) if (haystack.includes(t)) hits++
    // Minimum term-coverage threshold: a single incidental word match
    // (e.g. a generic heading like "Perguntas de jogador..." matching
    // only the word "jogador" out of a 2+ term query) was letting a
    // document's tier weight alone drag an unrelated chunk to the top --
    // a WRONG result, which is worse than returning nothing. Require at
    // least half the ORIGINAL query concepts (min 1 for single-concept
    // queries) to actually be present before a chunk is a candidate.
    // Deliberately keyed off baseConceptCount, not the alias-expanded
    // terms.length -- otherwise adding more aliases to a concept makes
    // the threshold stricter instead of more forgiving, which punishes
    // exactly the queries the alias table exists to help.
    const minHits = Math.max(1, Math.ceil(baseConceptCount / 2))
    if (hits < minHits) continue
    // A match made up ENTIRELY of a coincidental heading-word hit, with
    // zero support from the actual body text, is the other shape of
    // false positive seen in testing (e.g. a "Perguntas de jogador..."
    // heading matching the word "jogador" in an otherwise unrelated
    // guide). Require at least one hit to come from the body text itself
    // once the query has more than one concept (a single-concept query
    // legitimately matching only a title, e.g. "guild" -> "Guilds", is
    // fine and shouldn't be filtered).
    if (baseConceptCount > 1) {
      const bodyHaystack = stripAccents(chunk.text.toLowerCase())
      const bodyHits = terms.filter((t) => bodyHaystack.includes(t)).length
      if (bodyHits === 0) continue
    }

    const tierWeight = TIER_WEIGHT[chunk.verificationStatus] ?? 0
    // Score: term coverage (real content hits) + a title/section match
    // bonus + the tier weight. hits and headingHits are weighted EQUALLY
    // (3 each) -- an earlier 2-vs-5 split let one coincidental heading
    // word (e.g. a "1. Conta" section title matching just the word
    // "conta") outscore a chunk with two genuine content hits from the
    // real answer, which is backwards: a heading match is a real signal,
    // but it should not systematically outrank actual topical coverage.
    // See Part N's "Como crio uma conta?" investigation for the case
    // that surfaced this.
    const titleSectionHaystack = stripAccents(`${chunk.title} ${chunk.section || ''}`.toLowerCase())
    const headingHits = terms.filter((t) => titleSectionHaystack.includes(t)).length

    // Structural/document-level bonuses (tier, section-quality labeling)
    // describe the DOCUMENT, not the match -- scaling them by how much of
    // the query the chunk actually covers stops a barely-relevant chunk
    // (hits=1 out of many concepts) in a high-tier document from
    // outranking a chunk that covers the query far more completely in a
    // lower-tier document. Without this, reset-master-reset.md's highest
    // tier weight (5) plus its CURRENT_REAL_STATE section-quality bonus
    // (3) -- both flat, both document-level -- beat a chunk with double
    // the real content hits in every case checked during Part N.
    const relevanceRatio = Math.min(1, hits / baseConceptCount)
    const score = hits * 3 + headingHits * 3 + (tierWeight + sectionQualityBonus(chunk.section)) * relevanceRatio + documentTypePenalty(chunk.documentType)

    scored.push({ chunk, score, hits, headingHits })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}

function main() {
  const args = process.argv.slice(2)
  const query = args.find((a) => !a.startsWith('--'))
  const modeArg = args.find((a) => a.startsWith('--mode='))
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const mode = modeArg ? modeArg.split('=')[1] : 'player'
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 5

  if (!query) {
    console.error('Usage: knowledge-search-query.mjs "<query>" [--mode=player|support|admin] [--limit=5]')
    process.exit(1)
  }

  const results = search(query, { mode, limit })
  console.log(`Query: "${query}" (mode=${mode}) -- ${results.length} result(s)\n`)
  for (const r of results) {
    console.log(`[score ${r.score.toFixed(1)}] ${r.chunk.title}${r.chunk.section ? ' > ' + r.chunk.section : ''}`)
    console.log(`  source: ${r.chunk.sourcePath} | tier: ${r.chunk.verificationStatus} | visibility: ${r.chunk.playerVisibility}`)
    console.log(`  ${r.chunk.text.slice(0, 160).replace(/\n/g, ' ')}...`)
    console.log('')
  }
}

if (process.argv[1] && process.argv[1].endsWith('knowledge-search-query.mjs')) {
  main()
}
