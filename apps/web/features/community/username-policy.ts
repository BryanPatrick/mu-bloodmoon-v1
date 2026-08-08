// Real policy constants, not mock data. Mirrors the rules the API enforces on
// username changes (see apps/api/src/modules/community -- CommunityUsernameHistory,
// CommunityPolicy.usernameCooldownDays). Kept here so the UI can describe the
// rule without duplicating a hardcoded number that could drift from the API's
// own default (30 days, see migrations/20260802130000_community_social_profiles).
export const usernamePolicy = {
  minLength: 3,
  maxLength: 24,
  pattern: 'Letras minúsculas, números, ponto, hífen ou underline.',
  cooldownDays: 30,
  administrativeHistory: true
}
