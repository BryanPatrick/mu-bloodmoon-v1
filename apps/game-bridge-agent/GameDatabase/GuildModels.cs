namespace BloodMoon.GameBridgeAgent.GameDatabase;

// REAL_SQL_METADATA, confirmed 2026-08-20. GuildMembership is null when
// GuildMember has no row for this character ("not in a guild"), never an
// error. GuildInfo enrichment is a separate, optional lookup against Guild
// by G_Name -- kept simple per the request's own "manter o read model
// simples" instruction; only G_Master/G_Score/G_Union are surfaced.
public sealed record GuildMembershipInfo(string GuildName, int GuildStatus);

public sealed record GuildInfo(string GuildName, string? Master, int? Score, int Union);
