// GuildTreasuryBalance/GuildXpConversionRule amounts are Prisma BigInt
// (Zen-scale values run into the billions). JSON.stringify has no native
// BigInt support and throws -- standard fix, applied once as a module-load
// side effect. Imported by both main.ts (real server) and app.module.ts (so
// it also applies under Nest's testing module in e2e specs, which never run
// through main.ts's bootstrap()).
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function toJSON(this: bigint) {
  return this.toString()
}
