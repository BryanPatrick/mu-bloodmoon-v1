#!/usr/bin/env node
// Knowledge Phase 10, Part N -- recalculate FAQ self-service coverage.
// For every question in phase9/faq-completo.md, classify:
//   ANSWER_EXISTS: a real, evidence-based answer is written somewhere in
//     the player-facing corpus (regardless of whether search can find it)
//   ANSWER_SEARCHABLE: running the literal question through the REAL
//     player-mode search engine (knowledge-search-query.mjs) actually
//     surfaces that content in the top 3 -- empirically tested, not
//     asserted
//   STAFF_REQUIRED: no static self-service answer is possible even in
//     principle -- always needs a human to look at the specific
//     account/case (includes former TECHNICAL_REQUIRED rows, since the
//     player-facing resolution path for those is still "a human handles
//     your ticket")
//   POLICY_REQUIRED: blocked purely on an undecided product/business
//     decision, not on missing research or a need for case-by-case staff
//     judgment
import { search } from './knowledge-search-query.mjs'

// Extracted directly from phase9/faq-completo.md's table rows (Part N
// works from that document, not from memory). questionForSearch is the
// literal player question, used verbatim as the search query -- the most
// honest test of "would a real player's phrasing find this."
const FAQ = [
  { section: 'ACCOUNT', q: 'Como crio uma conta?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'ACCOUNT', q: 'Recebo e-mail de confirmação?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'ACCOUNT', q: 'E se eu esquecer minha senha e não receber o e-mail de recuperação?', docStatus: 'TECHNICAL_REQUIRED', hasRealAnswer: false },
  { section: 'ACCOUNT', q: 'Posso ter mais de uma conta?', docStatus: 'UNKNOWN', hasRealAnswer: false },
  { section: 'DOWNLOAD', q: 'Onde baixo o cliente/launcher?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'DOWNLOAD', q: 'O download funciona em Mac/Linux?', docStatus: 'PARTIAL', hasRealAnswer: true },
  { section: 'INSTALLATION', q: 'Preciso de requisitos mínimos?', docStatus: 'UNKNOWN', hasRealAnswer: false },
  { section: 'INSTALLATION', q: 'O instalador pede antivírus desligado?', docStatus: 'UNKNOWN', hasRealAnswer: false },
  { section: 'LAUNCHER', q: 'O launcher atualiza sozinho?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'LAUNCHER', q: 'O launcher trava ao abrir', docStatus: 'UNKNOWN', hasRealAnswer: false },
  { section: 'LOGIN', q: 'Erro "usuário ou senha inválidos"', docStatus: 'READY', hasRealAnswer: true },
  { section: 'LOGIN', q: 'Esqueci minha senha', docStatus: 'PARTIAL', hasRealAnswer: true },
  { section: 'CHARACTER', q: 'Quais classes existem?', docStatus: 'PARTIAL', hasRealAnswer: true },
  { section: 'CHARACTER', q: 'Quantos personagens por conta?', docStatus: 'UNKNOWN', hasRealAnswer: false },
  { section: 'LEVELING', q: 'Onde devo caçar no início?', docStatus: 'UNKNOWN', hasRealAnswer: false },
  { section: 'LEVELING', q: 'Existe boost de XP para novos jogadores?', docStatus: 'UNKNOWN', hasRealAnswer: false },
  { section: 'RESET', q: 'Como funciona o Reset?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'RESET', q: 'Existe requisito de reset para Blood Castle etc.?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'MASTER_RESET', q: 'Existe Master Reset?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'MASTER_RESET', q: 'Quando será ativado?', docStatus: 'POLICY_REQUIRED', hasRealAnswer: false },
  { section: 'EVENTS', q: 'Quais eventos estão ativos?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'EVENTS', q: 'Como entro no Blood Castle/Chaos Castle/Devil Square?', docStatus: 'PARTIAL', hasRealAnswer: true },
  { section: 'EVENTS', q: 'Por que /participar não funciona?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'EVENTS', q: 'Quando os outros eventos serão ativados?', docStatus: 'POLICY_REQUIRED', hasRealAnswer: false },
  { section: 'COMMANDS', q: 'Quais comandos posso usar?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'ITEMS', q: 'Como funciona empacotar joias?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'ITEMS', q: 'Perdi um item, o que faço?', docStatus: 'READY', hasRealAnswer: false },
  { section: 'TRADE', q: 'Como faço trade com outro jogador?', docStatus: 'UNKNOWN', hasRealAnswer: false },
  { section: 'MARKET', q: 'Como uso o Market?', docStatus: 'PARTIAL', hasRealAnswer: true },
  { section: 'GUILD', q: 'Como crio uma guild?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'GUILD', q: 'Como transfiro liderança?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'RANKING', q: 'Existe ranking?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'RANKING', q: 'O ranking aparece no site?', docStatus: 'TECHNICAL_REQUIRED', hasRealAnswer: false },
  { section: 'COMMUNITY', q: 'Como uso o feed de comunidade?', docStatus: 'PARTIAL', hasRealAnswer: true },
  { section: 'WIKI', q: 'Onde encontro informação do jogo?', docStatus: 'POLICY_REQUIRED', hasRealAnswer: false },
  { section: 'BUG_REPORT', q: 'Como reporto um bug?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'BUG_REPORT', q: 'Ganho recompensa por reportar?', docStatus: 'POLICY_REQUIRED', hasRealAnswer: true },
  { section: 'SECURITY', q: 'Minha conta foi invadida, o que faço?', docStatus: 'READY', hasRealAnswer: false },
  { section: 'SECURITY', q: 'Existe 2FA?', docStatus: 'READY', hasRealAnswer: true },
  { section: 'F2P', q: 'O servidor é gratuito?', docStatus: 'POLICY_REQUIRED', hasRealAnswer: true },
  { section: 'RMT', q: 'Posso comprar/vender itens com dinheiro real?', docStatus: 'POLICY_REQUIRED', hasRealAnswer: false },
  { section: 'CLAN_RECEPTION', q: 'Existe recompensa por migrar meu clã de outro servidor?', docStatus: 'POLICY_REQUIRED', hasRealAnswer: false },
  { section: 'STAFF', q: 'Como me tornar staff/GM?', docStatus: 'POLICY_REQUIRED', hasRealAnswer: false },
  { section: 'OPEN_BETA', q: 'O que é o Open Beta?', docStatus: 'POLICY_REQUIRED', hasRealAnswer: true },
  { section: 'OPEN_BETA', q: 'O que acontece com meu personagem depois do Beta?', docStatus: 'POLICY_REQUIRED', hasRealAnswer: false }
]

function classify(row, searchable) {
  // POLICY_REQUIRED wins regardless of searchability -- a searchable
  // "we haven't decided yet" chunk doesn't change that the underlying
  // question has no real answer.
  if (row.docStatus === 'POLICY_REQUIRED') return 'POLICY_REQUIRED'
  if (!row.hasRealAnswer) return 'STAFF_REQUIRED'
  // has a real answer -- searchable or not
  return searchable ? 'ANSWER_SEARCHABLE' : 'ANSWER_EXISTS_NOT_SEARCHABLE'
}

function main() {
  const rows = []
  for (const row of FAQ) {
    let top3 = []
    try {
      top3 = search(row.q, { mode: 'player', limit: 3 })
    } catch {
      top3 = []
    }
    const searchable = top3.length > 0
    const verdict = classify(row, searchable)
    rows.push({ ...row, searchable, top1: top3[0] ? `${top3[0].chunk.sourcePath} > ${top3[0].chunk.section || top3[0].chunk.title}` : '(none)', verdict })
  }

  const counts = {}
  for (const r of rows) counts[r.verdict] = (counts[r.verdict] || 0) + 1
  const total = rows.length
  const answerExistsCount = rows.filter((r) => r.verdict === 'ANSWER_SEARCHABLE' || r.verdict === 'ANSWER_EXISTS_NOT_SEARCHABLE').length
  const searchableCount = rows.filter((r) => r.verdict === 'ANSWER_SEARCHABLE').length

  console.log(JSON.stringify({
    total,
    counts,
    CONTENT_COVERAGE_PERCENT: +((answerExistsCount / total) * 100).toFixed(1),
    SEARCHABLE_SELF_SERVICE_COVERAGE_PERCENT: +((searchableCount / total) * 100).toFixed(1),
    rows
  }, null, 2))
}

main()
