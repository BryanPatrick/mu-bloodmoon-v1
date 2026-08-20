namespace BloodMoon.GameBridgeAgent.GameDatabase;

// REAL_SQL_METADATA, confirmed 2026-08-20 (references/game-data/sql-discovery/).
// MembId is intentionally internal-only -- it is the memb___id login bridge
// used to chain further reads (AccountCharacter/CashShopData/warehouse/
// MEMB_STAT all key off it), never the canonical identity. It must never
// appear in an output read model, event payload, D1 row, log message, or
// anything the frontend/API can see. MembGuid is the canonical identity.
public sealed record MembInfoAccount(int MembGuid, string MembId);

// AccountCharacter.Id is the same memb___id bridge -- kept internal for the
// same reason. Slots preserve real GameID1..GameID10 order; empty/null
// slots are already filtered out here. ActiveCharacterName is GameIDC --
// never treated as an 11th slot.
public sealed record AccountCharacterSlots(
    string Id,
    IReadOnlyList<CharacterSlotRef> Slots,
    string? ActiveCharacterName
);

public sealed record CharacterSlotRef(int SlotNumber, string CharacterName);
