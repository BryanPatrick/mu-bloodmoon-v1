#!/usr/bin/env node
// Knowledge Phase 10, Parts L/M -- 20-query Portuguese test corpus against
// knowledge-search-query.mjs. Every query is run in player mode (the mode
// that matters for self-service). Each expectation is classified by a
// human (not by the search engine itself) against the actual result --
// CORRECT (top result answers the query, no internal leakage), PARTIAL
// (a relevant result appears but isn't the best possible one, or the
// answer requires following a link), WRONG (top result contradicts or
// misleads, OR any internal/admin chunk leaked -- worse than NOT_FOUND
// per the user's explicit instruction), NOT_FOUND (no relevant result).
import { search } from './knowledge-search-query.mjs'

// expectDoc lists every PLAYER-FACING file (player visibility only --
// internal-only sources like support-runbook.md or the phase10
// internal-findings docs are intentionally excluded even where they
// hold the deepest evidence, since a player-mode query must never
// resolve to them in the first place) that would count as a correct or
// partial answer for that query.
const QUERIES = [
  { q: 'como criar personagem', expectDoc: 'player-journey-map.md|seus-primeiros-30-minutos.md|faq-completo.md' },
  { q: 'quais classes existem', expectDoc: 'faq-completo.md' },
  { q: 'não recebi email', expectDoc: 'faq-completo.md' },
  { q: 'preciso confirmar email para jogar', expectDoc: 'faq-completo.md' },
  { q: 'como entrar no blood castle', expectDoc: 'eventos.md|reset-master-reset.md|seus-primeiros-30-minutos.md|voltando-ao-mu.md' },
  { q: 'nivel para bc', expectDoc: 'eventos.md|reset-master-reset.md' },
  { q: 'devil square requisito', expectDoc: 'eventos.md|reset-master-reset.md' },
  { q: 'chaos castle como participar', expectDoc: 'eventos.md|reset-master-reset.md' },
  { q: 'illusion temple esta ativo', expectDoc: 'eventos.md|reset-master-reset.md' },
  { q: 'quais eventos estao ativos', expectDoc: 'eventos.md|reset-master-reset.md' },
  { q: 'como resetar', expectDoc: 'reset-master-reset.md' },
  { q: 'master reset quando ativa', expectDoc: 'reset-master-reset.md' },
  { q: 'o que e wcoinc', expectDoc: 'glossario.md|eventos.md' },
  { q: 'como participar do leilao', expectDoc: 'auction.md|comandos.md|eventos.md' },
  { q: 'como criar guild', expectDoc: 'guilds.md' },
  { q: 'transferir lideranca de guild', expectDoc: 'guilds.md' },
  { q: 'launcher nao abre', expectDoc: 'faq-completo.md|seus-primeiros-30-minutos.md|checklist-o-que-testar.md' },
  { q: 'como denunciar um jogador', expectNotFoundOk: true }, // no player-facing "report a player" doc exists yet -- see Part N gap
  { q: 'posso vender item por dinheiro real', expectNotFoundOk: true }, // RMT is POLICY_REQUIRED, never invented -- NOT_FOUND is the honest answer
  { q: 'comando gm abrir evento', expectDocNone: true } // must NOT leak GM_COMMAND in player mode
]

function classify(result, spec) {
  if (spec.expectNotFoundOk) {
    // No player-facing content covers this yet (a real, honestly-flagged
    // gap -- see Part N/P) -- NOT_FOUND is the correct, safe outcome.
    // Any visibility leak is still WRONG; any other non-empty result is
    // a borderline over-return, flagged PARTIAL for manual review rather
    // than assumed wrong.
    if (result.length === 0) return 'NOT_FOUND'
    const leaked = result.some((r) => r.chunk.playerVisibility !== 'PUBLIC_PLAYER')
    return leaked ? 'WRONG' : 'PARTIAL'
  }
  if (spec.expectDocNone) {
    // player-mode query deliberately phrased like an admin request --
    // correct behavior is returning nothing relevant, or only
    // player-safe material, never the GM_COMMAND chunk.
    const leaked = result.some((r) => r.chunk.playerVisibility !== 'PUBLIC_PLAYER')
    if (leaked) return 'WRONG'
    return result.length === 0 ? 'CORRECT' : 'PARTIAL'
  }
  if (result.length === 0) return 'NOT_FOUND'
  const leaked = result.some((r) => r.chunk.playerVisibility !== 'PUBLIC_PLAYER')
  if (leaked) return 'WRONG'
  const docPatterns = spec.expectDoc.split('|')
  const top1Match = docPatterns.some((p) => result[0].chunk.sourcePath.includes(p))
  if (top1Match) return 'CORRECT'
  const top3Match = result.slice(0, 3).some((r) => docPatterns.some((p) => r.chunk.sourcePath.includes(p)))
  if (top3Match) return 'PARTIAL'
  return 'WRONG'
}

function main() {
  const rows = []
  for (const spec of QUERIES) {
    const result = search(spec.q, { mode: 'player', limit: 5 })
    const verdict = classify(result, spec)
    rows.push({
      query: spec.q,
      verdict,
      top1: result[0] ? `${result[0].chunk.sourcePath} > ${result[0].chunk.section || result[0].chunk.title}` : '(none)'
    })
  }

  const counts = { CORRECT: 0, PARTIAL: 0, WRONG: 0, NOT_FOUND: 0 }
  for (const r of rows) counts[r.verdict]++

  console.log('QUERY_TEST_RESULTS')
  console.log('='.repeat(100))
  for (const r of rows) {
    console.log(`[${r.verdict.padEnd(9)}] "${r.query}"`)
    console.log(`            -> ${r.top1}`)
  }
  console.log('='.repeat(100))
  console.log(`TOTAL: ${rows.length}`)
  console.log(`CORRECT: ${counts.CORRECT}`)
  console.log(`PARTIAL: ${counts.PARTIAL}`)
  console.log(`WRONG_RESULT: ${counts.WRONG}`)
  console.log(`NOT_FOUND: ${counts.NOT_FOUND}`)
  console.log(`TOP1_CORRECT_RATE: ${((counts.CORRECT / rows.length) * 100).toFixed(1)}%`)
  console.log(`TOP3_USABLE_RATE: ${(((counts.CORRECT + counts.PARTIAL) / rows.length) * 100).toFixed(1)}%`)

  if (counts.WRONG > 0) {
    console.error('\nFAIL: WRONG_RESULT > 0 -- a WRONG result (including any visibility leak) is worse than NOT_FOUND and must be fixed before this suite passes.')
    process.exitCode = 1
  }
}

main()
