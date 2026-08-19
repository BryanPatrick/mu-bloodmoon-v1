// Guards apps/api/src/modules/characters/characters.service.ts's demo
// character seed (MoonElf/LordAdmin/BloodMage/FairyQueen, attached to
// literal `admin`/`player` usernames). Mirrors test-personas.env.ts's
// shape deliberately: no single flag is enough on its own -- a stray
// CHARACTERS_DEMO_SEED_ENABLED=true in the wrong place must not attach
// fabricated characters to a real production account named "admin" or
// "player" -- so all three conditions have to hold at once: the explicit
// opt-in flag, an allowed NODE_ENV, and a DATABASE_URL that is not the
// known production database.
const PRODUCTION_DATABASE_MARKER = /mubloodxz_bloodmoon/i
const ALLOWED_NODE_ENVS = new Set(['development', 'test'])

export function isDemoCharacterSeedingSafe(): boolean {
  if (process.env.CHARACTERS_DEMO_SEED_ENABLED !== 'true') return false
  if (!ALLOWED_NODE_ENVS.has(process.env.NODE_ENV || '')) return false
  const dbUrl = process.env.DATABASE_URL || ''
  if (!dbUrl) return false
  return !PRODUCTION_DATABASE_MARKER.test(dbUrl)
}
