import type { Prisma, ProgressionDomain, ProgressionPolicyStatus, ProgressionRiskLevel } from '@prisma/client'

// PHASE U (2026-09-03) -- every row here traces to a real key in
// GameServerInfo - Common.dat / - Command.dat, re-read and hash-verified
// this phase. See docs/progression/progression-config-field-matrix.md
// for the full field-by-field evidence each row below is generated from
// -- this file is deliberately business-facing (25 rows), not a 1:1
// dump of the ~370 raw config keys those two files contain (Part 11's
// own explicit instruction: "do not create one database row per raw
// config line without thought").

export type ProgressionSeedEntry = {
  domain: ProgressionDomain
  key: string
  friendlyLabel: string
  description: string
  unit: string | null
  technicalSource: Prisma.InputJsonValue
  riskLevel: ProgressionRiskLevel
  effectiveValue: Prisma.InputJsonValue
  // Only set for reset.cap this phase -- every other row starts with no
  // desired opinion at all (null), per this project's own "no opinion
  // != false drift" rule (same one legacy-catalog-effective-state.
  // service.ts uses).
  desiredValue?: Prisma.InputJsonValue
  desiredReason?: string
  // PHASE V (2026-09-04) -- business-approval classification, distinct
  // from driftStatus. See ProgressionPolicyStatus's own schema comment.
  policyStatus: ProgressionPolicyStatus
}

const UNIT_UNCONFIRMED = 'unidade/formula nao confirmada (ver docs/progression/xp-stacking-investigation.md)'

export const PROGRESSION_SEED_ENTRIES: ProgressionSeedEntry[] = [
  // EXPERIENCE
  {
    domain: 'EXPERIENCE', key: 'xp.rate',
    friendlyLabel: 'Experiencia -- taxa por tier',
    description: 'Valor pelo qual a experiencia do servidor e multiplicada, por tier de conta (Free/Bronze/Silver/Gold). O texto do fornecedor confirma "multiplicada", mas nao confirma se 50 significa 50x ou +50% -- ver investigacao de stacking.',
    unit: UNIT_UNCONFIRMED,
    technicalSource: { file: 'GameServerInfo - Common.dat', key: 'AddExperienceRate_AL0-3', shape: 'perTier' },
    riskLevel: 'HIGH',
    effectiveValue: { AL0: 50, AL1: 60, AL2: 60, AL3: 60 },
    policyStatus: 'EFFECTIVE_BUT_UNAPPROVED'
  },
  {
    domain: 'EXPERIENCE', key: 'xp.master_rate',
    friendlyLabel: 'Experiencia master -- taxa por tier',
    description: 'Mesmo mecanismo de xp.rate, aplicado a experiencia master (pos Master Reset).',
    unit: UNIT_UNCONFIRMED,
    technicalSource: { file: 'GameServerInfo - Common.dat', key: 'AddMasterExperienceRate_AL0-3', shape: 'perTier' },
    riskLevel: 'HIGH',
    effectiveValue: { AL0: 20, AL1: 22, AL2: 22, AL3: 22 },
    policyStatus: 'EFFECTIVE_BUT_UNAPPROVED'
  },
  {
    domain: 'EXPERIENCE', key: 'xp.event_rate',
    friendlyLabel: 'Experiencia -- taxa de evento',
    description: 'Multiplicador de XP aplicado durante eventos. Hoje identico nos 4 tiers (300).',
    unit: UNIT_UNCONFIRMED,
    technicalSource: { file: 'GameServerInfo - Common.dat', key: 'AddEventExperienceRate_AL0-3', shape: 'perTier' },
    riskLevel: 'MEDIUM',
    effectiveValue: { AL0: 300, AL1: 300, AL2: 300, AL3: 300 },
    policyStatus: 'NOT_EVALUATED'
  },
  {
    domain: 'EXPERIENCE', key: 'xp.quest_rate',
    friendlyLabel: 'Experiencia -- taxa de quest',
    description: 'Multiplicador de XP aplicado a experiencia concedida por quests. Hoje identico nos 4 tiers (100).',
    unit: UNIT_UNCONFIRMED,
    technicalSource: { file: 'GameServerInfo - Common.dat', key: 'AddQuestExperienceRate_AL0-3', shape: 'perTier' },
    riskLevel: 'MEDIUM',
    effectiveValue: { AL0: 100, AL1: 100, AL2: 100, AL3: 100 },
    policyStatus: 'NOT_EVALUATED'
  },
  {
    domain: 'EXPERIENCE', key: 'xp.master_min_monster_level',
    friendlyLabel: 'Experiencia master -- nivel minimo de monstro',
    description: 'Nivel minimo que um monstro precisa ter para conceder experiencia master ao ser derrotado.',
    unit: 'nivel de monstro',
    technicalSource: { file: 'GameServerInfo - Common.dat', key: 'MinMasterExperienceMonsterLevel_AL0-3', shape: 'perTier' },
    riskLevel: 'LOW',
    effectiveValue: { AL0: 136, AL1: 136, AL2: 136, AL3: 136 },
    policyStatus: 'NOT_EVALUATED'
  },
  {
    domain: 'EXPERIENCE', key: 'xp.formula_const_a',
    friendlyLabel: 'Experiencia -- constante de formula (A)',
    description: 'Constante interna da formula de calculo de XP (documentacao do fornecedor confirma que existe e e usada, mas nao entrega a formula completa). NAO editar sem entender o efeito -- risco CRITICAL.',
    unit: UNIT_UNCONFIRMED,
    technicalSource: { file: 'GameServerInfo - Common.dat', key: 'ExperienceMultiplierConstA', shape: 'flat' },
    riskLevel: 'CRITICAL',
    effectiveValue: 10,
    policyStatus: 'NOT_EVALUATED'
  },
  {
    domain: 'EXPERIENCE', key: 'xp.formula_const_b',
    friendlyLabel: 'Experiencia -- constante de formula (B)',
    description: 'Segunda constante interna da mesma formula de XP. Mesmo aviso de xp.formula_const_a.',
    unit: UNIT_UNCONFIRMED,
    technicalSource: { file: 'GameServerInfo - Common.dat', key: 'ExperienceMultiplierConstB', shape: 'flat' },
    riskLevel: 'CRITICAL',
    effectiveValue: 1000,
    policyStatus: 'NOT_EVALUATED'
  },
  {
    domain: 'EXPERIENCE', key: 'xp.random_additional',
    friendlyLabel: 'Experiencia -- variacao aleatoria adicional',
    description: 'Termo de variacao aleatoria aplicado ao calculo de XP. Atualmente inerte (0).',
    unit: UNIT_UNCONFIRMED,
    technicalSource: { file: 'GameServerInfo - Common.dat', key: 'ExperienceRandomAditional', shape: 'flat' },
    riskLevel: 'LOW',
    effectiveValue: 0,
    policyStatus: 'NOT_EVALUATED'
  },
  // DROP
  {
    domain: 'DROP', key: 'drop.item_rate',
    friendlyLabel: 'Drop de item -- taxa por tier',
    description: 'Porcentagem direta de chance (0-100) de um monstro dropar algum item, por tier de conta. Confirmado pelo fornecedor como porcentagem literal -- escala diferente do drop por mapa (base-100) e do drop excellent/ancient (fracao de 1.000.000).',
    unit: 'porcentagem de chance (0-100)',
    technicalSource: { file: 'GameServerInfo - Common.dat', key: 'ItemDropRate_AL0-3', shape: 'perTier' },
    riskLevel: 'HIGH',
    effectiveValue: { AL0: 100, AL1: 120, AL2: 120, AL3: 120 },
    policyStatus: 'EFFECTIVE_BUT_UNAPPROVED'
  },
  {
    domain: 'DROP', key: 'drop.item_ground_seconds',
    friendlyLabel: 'Drop de item -- tempo no chao',
    description: 'Quantos segundos um item dropado fica visivel no chao antes de desaparecer.',
    unit: 'segundos',
    technicalSource: { file: 'GameServerInfo - Common.dat', key: 'ItemDropTime', shape: 'flat' },
    riskLevel: 'LOW',
    effectiveValue: 20,
    policyStatus: 'NOT_EVALUATED'
  },
  {
    domain: 'DROP', key: 'drop.zen_rate',
    friendlyLabel: 'Drop de zen -- taxa por tier',
    description: 'Porcentagem direta de chance de zen (dinheiro) dropar de um monstro, por tier de conta.',
    unit: 'porcentagem de chance (0-100)',
    technicalSource: { file: 'GameServerInfo - Common.dat', key: 'MoneyAmountDropRate_AL0-3', shape: 'perTier' },
    riskLevel: 'MEDIUM',
    effectiveValue: { AL0: 10, AL1: 12, AL2: 12, AL3: 12 },
    policyStatus: 'EFFECTIVE_BUT_UNAPPROVED'
  },
  {
    domain: 'DROP', key: 'drop.zen_ground_seconds',
    friendlyLabel: 'Drop de zen -- tempo no chao',
    description: 'Quantos segundos o zen dropado fica visivel no chao antes de desaparecer.',
    unit: 'segundos',
    technicalSource: { file: 'GameServerInfo - Common.dat', key: 'MoneyDropTime', shape: 'flat' },
    riskLevel: 'LOW',
    effectiveValue: 10,
    policyStatus: 'NOT_EVALUATED'
  },
  // RESET
  {
    domain: 'RESET', key: 'reset.enabled',
    friendlyLabel: 'Reset -- habilitado',
    description: 'Chave mestra que liga/desliga o comando /reset no servidor inteiro.',
    unit: 'booleano (0/1)',
    technicalSource: { file: 'GameServerInfo - Command.dat', key: 'CommandResetSwitch', shape: 'flat' },
    riskLevel: 'CRITICAL',
    effectiveValue: 1,
    policyStatus: 'NOT_EVALUATED'
  },
  {
    domain: 'RESET', key: 'reset.level_required',
    friendlyLabel: 'Reset -- nivel necessario',
    description: 'Nivel de personagem exigido para poder resetar, por tier de conta.',
    unit: 'nivel de personagem',
    technicalSource: { file: 'GameServerInfo - Command.dat', key: 'CommandResetLevel_AL0-3', shape: 'perTier' },
    riskLevel: 'HIGH',
    effectiveValue: { AL0: 400, AL1: 400, AL2: 400, AL3: 400 },
    policyStatus: 'NOT_EVALUATED'
  },
  {
    domain: 'RESET', key: 'reset.money_cost',
    friendlyLabel: 'Reset -- custo em Zen',
    description: 'Custo em Zen para resetar, por tier de conta. Hoje gratis (0) para todos.',
    unit: 'Zen',
    technicalSource: { file: 'GameServerInfo - Command.dat', key: 'CommandResetMoney_AL0-3', shape: 'perTier' },
    riskLevel: 'MEDIUM',
    effectiveValue: { AL0: 0, AL1: 0, AL2: 0, AL3: 0 },
    policyStatus: 'NOT_EVALUATED'
  },
  {
    domain: 'RESET', key: 'reset.cap',
    friendlyLabel: 'Reset -- limite total',
    description: 'Numero maximo de resets que uma conta pode acumular, por tier. O tier Gold (AL3) esta hoje configurado em 50, 2,5x acima dos outros tres tiers. SUPERSEDES (2026-09-08): a Fase V (2026-09-04) havia registrado "reset cap = 20 para todos os tiers" como decisao final -- Bryan reabriu essa decisao nesta data e ela volta ao estado RESET_CAP = UNRESOLVED (ver docs/decisions/0029-progression-reset-policy-current-ruling.md). Nenhum valor de cap deve ser inferido ou tratado como decidido ate uma nova ratificacao explicita.',
    unit: 'contagem de resets',
    technicalSource: { file: 'GameServerInfo - Command.dat', key: 'CommandResetLimit_AL0-3', shape: 'perTier' },
    riskLevel: 'HIGH',
    effectiveValue: { AL0: 20, AL1: 20, AL2: 20, AL3: 50 },
    // desiredValue intentionally absent (undefined -> null in the DB) --
    // "Portal has no opinion yet," the same established rule this file's
    // own type comment documents. Do NOT set a numeric target here until
    // RESET_CAP_STATUS moves off UNRESOLVED via a real, dated ADR.
    policyStatus: 'NOT_EVALUATED'
  },
  {
    domain: 'RESET', key: 'reset.stat_points',
    friendlyLabel: 'Reset -- pontos de status concedidos',
    description: 'Pontos de status (STR/AGI/VIT/ENE/LEAD) concedidos a cada reset, por tier. Free (AL0) recebe 450, Bronze/Silver/Gold recebem 500 -- 50 pontos a menos por reset, um GAP PERMANENTE que sobrevive mesmo apos o limite de reset (reset.cap) ser corrigido para 20 em todos os tiers (1.000 pontos de diferenca em 20 resets, nao um efeito de velocidade). POLICY_DRIFT confirmado contra a decisao final de Bryan (Fase X, 2026-09-04): a recompensa de pontos de reset DEVE ser igual para todos os tiers -- VIP nao pode produzir poder final permanente indisponivel ao F2P.',
    unit: 'pontos de status',
    technicalSource: { file: 'GameServerInfo - Command.dat', key: 'CommandResetPoint_AL0-3', shape: 'perTier' },
    riskLevel: 'HIGH',
    effectiveValue: { AL0: 450, AL1: 500, AL2: 500, AL3: 500 },
    desiredValue: { AL0: 450, AL1: 500, AL2: 500, AL3: 500 },
    desiredReason: 'SUPERSEDE (Fase AD, 2026-09-05): Bryan revisitou e resolveu o conflito de decisao explicitamente -- a politica desejada agora e Free (AL0) = 450, Bronze/Silver/Gold (AL1-3) = 500, ou seja, igual ao valor efetivo real do GameServer hoje. Isto substitui a DECISAO 2 da Fase X (2026-09-04, preservada abaixo para historico), que havia pedido 450 fixo para todos os tiers. Citacao original da Fase X, agora superada: "a recompensa de pontos de status por reset deve ser IGUAL para todos os tiers -- usar 450/450/450/450 como politica desejada atual." NENHUMA sincronizacao com o GameServer foi realizada ou e autorizada nesta fase -- apenas a politica desejada do Portal foi corrigida para eliminar o POLICY_DRIFT que ja nao reflete a decisao atual de Bryan.',
    policyStatus: 'APPROVED'
  },
  {
    domain: 'RESET', key: 'reset.start_level',
    friendlyLabel: 'Reset -- nivel apos resetar',
    description: 'Nivel do personagem imediatamente apos completar um reset.',
    unit: 'nivel de personagem',
    technicalSource: { file: 'GameServerInfo - Command.dat', key: 'CommandResetStartLevel_AL0-3', shape: 'perTier' },
    riskLevel: 'MEDIUM',
    effectiveValue: { AL0: 1, AL1: 1, AL2: 1, AL3: 1 },
    policyStatus: 'NOT_EVALUATED'
  },
  // MASTER_RESET -- every row DISABLED: the master switch is off, so no
  // per-tier value below it (even the deliberately-customized ones) is
  // currently reachable by any player of any tier.
  {
    domain: 'MASTER_RESET', key: 'master_reset.enabled',
    friendlyLabel: 'Master Reset -- habilitado',
    description: 'Chave mestra do comando /masterreset. Hoje DESLIGADA -- todo o resto deste dominio e moot ate essa chave mudar.',
    unit: 'booleano (0/1)',
    technicalSource: { file: 'GameServerInfo - Command.dat', key: 'CommandMasterResetSwitch', shape: 'flat' },
    riskLevel: 'CRITICAL',
    effectiveValue: 0,
    policyStatus: 'DISABLED'
  },
  {
    domain: 'MASTER_RESET', key: 'master_reset.level_required',
    friendlyLabel: 'Master Reset -- nivel necessario',
    description: 'Nivel de personagem exigido para Master Reset, por tier (inativo enquanto master_reset.enabled=0).',
    unit: 'nivel de personagem',
    technicalSource: { file: 'GameServerInfo - Command.dat', key: 'CommandMasterResetLevel_AL0-3', shape: 'perTier' },
    riskLevel: 'HIGH',
    effectiveValue: { AL0: 400, AL1: 400, AL2: 400, AL3: 400 },
    policyStatus: 'DISABLED'
  },
  {
    domain: 'MASTER_RESET', key: 'master_reset.reset_required',
    friendlyLabel: 'Master Reset -- resets necessarios',
    description: 'Quantidade minima de resets acumulados exigida antes de poder fazer Master Reset. Valor deliberadamente customizado (nao e um default de template) -- evidencia de que o recurso foi preparado, nao apenas deixado default.',
    unit: 'contagem de resets',
    technicalSource: { file: 'GameServerInfo - Command.dat', key: 'CommandMasterResetReset_AL0-3', shape: 'perTier' },
    riskLevel: 'HIGH',
    effectiveValue: { AL0: 1000, AL1: 1000, AL2: 1000, AL3: 1000 },
    policyStatus: 'DISABLED'
  },
  {
    domain: 'MASTER_RESET', key: 'master_reset.money_cost',
    friendlyLabel: 'Master Reset -- custo em Zen',
    description: 'Custo em Zen do Master Reset, por tier. Hoje gratis (0).',
    unit: 'Zen',
    technicalSource: { file: 'GameServerInfo - Command.dat', key: 'CommandMasterResetMoney_AL0-3', shape: 'perTier' },
    riskLevel: 'MEDIUM',
    effectiveValue: { AL0: 0, AL1: 0, AL2: 0, AL3: 0 },
    policyStatus: 'DISABLED'
  },
  {
    domain: 'MASTER_RESET', key: 'master_reset.stat_points',
    friendlyLabel: 'Master Reset -- pontos de status concedidos',
    description: 'Pontos de status concedidos por Master Reset, por tier. Hoje ZERO -- diferente do Reset normal (450-500). O beneficio do Master Reset, se ativado, viria de destravar a progressao de Master Level, nao de pontos diretos.',
    unit: 'pontos de status',
    technicalSource: { file: 'GameServerInfo - Command.dat', key: 'CommandMasterResetPoint_AL0-3', shape: 'perTier' },
    riskLevel: 'HIGH',
    effectiveValue: { AL0: 0, AL1: 0, AL2: 0, AL3: 0 },
    policyStatus: 'DISABLED'
  },
  {
    domain: 'MASTER_RESET', key: 'master_reset.start_level',
    friendlyLabel: 'Master Reset -- nivel apos resetar',
    description: 'Nivel do personagem apos Master Reset. Diferente do Reset normal (que volta a 1) -- Master Reset mantem o personagem em 400.',
    unit: 'nivel de personagem',
    technicalSource: { file: 'GameServerInfo - Command.dat', key: 'CommandMasterResetStartLevel_AL0-3', shape: 'perTier' },
    riskLevel: 'MEDIUM',
    effectiveValue: { AL0: 400, AL1: 400, AL2: 400, AL3: 400 },
    policyStatus: 'DISABLED'
  },
  {
    domain: 'MASTER_RESET', key: 'master_reset.start_reset',
    friendlyLabel: 'Master Reset -- contagem de reset apos resetar',
    description: 'Contador de resets do personagem apos Master Reset -- zerado, reiniciando o ciclo de acumulo de resets.',
    unit: 'contagem de resets',
    technicalSource: { file: 'GameServerInfo - Command.dat', key: 'CommandMasterResetStartReset_AL0-3', shape: 'perTier' },
    riskLevel: 'MEDIUM',
    effectiveValue: { AL0: 0, AL1: 0, AL2: 0, AL3: 0 },
    policyStatus: 'DISABLED'
  }
]
