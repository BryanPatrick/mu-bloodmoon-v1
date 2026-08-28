#!/usr/bin/env node
// Knowledge Phase 10, Part O -- support escalation routing for queries
// the search layer can't self-serve. Deliberately conservative: this
// module NEVER invents an answer to dodge escalation. If player-mode
// search doesn't return a confident, relevant result, the query gets
// routed to a category for a human -- it is never papered over with a
// low-confidence guess.
//
// Usage: node scripts/knowledge-support-escalation.mjs "<query>"
import { search } from './knowledge-search-query.mjs'

// Keyword -> category routing table. Deliberately small and literal
// (matches the FAQ's own section taxonomy from faq-completo.md /
// support-runbook.md), not a generic classifier -- a query that matches
// nothing here falls through to STAFF_ESCALATION (the safe default),
// never to a guessed category.
// Order matters: checked top-to-bottom, first match wins. POLICY_PENDING
// is checked FIRST -- deliberately, even though it reads as the most
// "specific" category last in a natural list -- because its keywords
// ("dinheiro real", "recompensa", "vip"...) can co-occur with generic
// GAMEPLAY_SUPPORT words ("item", "evento") in the same sentence (e.g.
// "posso vender item por dinheiro real" contains both "item" and
// "dinheiro real"), and a policy-sensitive question must never be
// silently reclassified as ordinary gameplay support just because a
// broader category's keyword list happens to be checked first.
const CATEGORY_KEYWORDS = {
  POLICY_PENDING: ['rmt', 'dinheiro real', 'vender item', 'comprar item', 'vip', 'f2p', 'gratuito', 'staff', 'gm', 'recompensa', 'preco', 'loja', 'wipe', 'progresso depois'],
  ACCOUNT_SUPPORT: ['conta', 'cadastro', 'registrar', 'email', 'e-mail', 'senha', 'login', 'logar', '2fa', 'recuperacao', 'recuperar'],
  LAUNCHER_SUPPORT: ['launcher', 'baixar', 'download', 'instalar', 'instalador', 'patch', 'atualizar', 'atualizacao'],
  BUG_REPORT: ['bug', 'erro', 'travou', 'travando', 'crash', 'duplicou', 'sumiu', 'perdi', 'desapareceu'],
  GAMEPLAY_SUPPORT: [
    'personagem', 'classe', 'nivel', 'reset', 'masterreset', 'evento', 'blood castle', 'chaos castle', 'devil square',
    'illusion temple', 'guild', 'ranking', 'item', 'trade', 'market', 'leilao', 'comando', 'inventario'
  ],
  STAFF_ESCALATION: [] // fallback -- never keyword-matched directly, always the default
}

function classifyCategory(query) {
  const q = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'STAFF_ESCALATION') continue
    if (keywords.some((k) => q.includes(k))) return category
  }
  return 'STAFF_ESCALATION'
}

// A result only counts as "self-serve confident" if it clears a real bar
// -- not just non-empty. Mirrors the minHits/bodyHits discipline already
// enforced inside search() itself; this is a second, independent gate at
// the escalation layer so a borderline match still routes to a human
// instead of being presented as a confident answer.
const MIN_CONFIDENT_SCORE = 9

export function route(query, { mode = 'player' } = {}) {
  const category = classifyCategory(query)
  const results = search(query, { mode, limit: 3 })
  const top = results[0]

  // Policy-sensitive topics (RMT, pricing, staff recruitment, wipe
  // policy...) never self-serve off a raw search score, even a high
  // one. A confident-looking match on a loaded topic can still be
  // pointing at unrelated content that only shares vocabulary (verified
  // directly during Part O development: "posso vender item por dinheiro
  // real" scored higher against an unrelated reset-mechanics chunk than
  // against the FAQ's actual, correct RMT row) -- and even a genuinely
  // on-topic match risks being read as an official policy answer when
  // it's actually just evidence-gathering prose. Route to a human/policy
  // queue unconditionally instead.
  if (category === 'POLICY_PENDING') {
    return {
      outcome: 'ESCALATE',
      category,
      lowConfidenceContext: top ? { source: top.chunk.sourcePath, section: top.chunk.section || top.chunk.title, score: top.score } : null
    }
  }

  const selfServeConfident = !!top && top.score >= MIN_CONFIDENT_SCORE

  if (selfServeConfident) {
    return {
      outcome: 'SELF_SERVE',
      answer: {
        source: top.chunk.sourcePath,
        section: top.chunk.section || top.chunk.title,
        text: top.chunk.text
      }
    }
  }

  return {
    outcome: 'ESCALATE',
    category,
    // never fabricated -- either the best (low-confidence) hit is shown
    // as unconfirmed context for the human agent, or nothing at all
    lowConfidenceContext: top ? { source: top.chunk.sourcePath, section: top.chunk.section || top.chunk.title, score: top.score } : null
  }
}

function main() {
  const query = process.argv.slice(2).find((a) => !a.startsWith('--'))
  if (!query) {
    console.error('Usage: knowledge-support-escalation.mjs "<query>"')
    process.exit(1)
  }
  const result = route(query)
  console.log(JSON.stringify(result, null, 2))
}

if (process.argv[1] && process.argv[1].endsWith('knowledge-support-escalation.mjs')) {
  main()
}
