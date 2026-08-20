namespace BloodMoon.GameBridgeAgent.GameDatabase;

// REAL_SQL_METADATA, confirmed 2026-08-20. Every field here is a real
// Character column verified against the live database -- see
// references/game-data/sql-discovery/live-20260820/normalized/real-schema.json.
//
// Deliberately excluded, even though the legacy web code (LEGACY_CODE_CONFIRMED
// only) referenced it: `RuudMoney`. A full real-schema column enumeration of
// Character (60 columns) does not contain it -- this is a genuine
// CONTRADICTS_CURRENT_ASSUMPTION finding, not an oversight. Never add it
// back without re-confirming it exists on the live server.
//
// Deliberately excluded, by design, not by gap: Inventory, Quest,
// MagicList, EffectList -- these are blobs and stay out of the read model
// this phase (see docs/game-data/account-identity.md and
// docs/game-data/legacy-web-intelligence/inventory-warehouse.md).
//
// AccountId is Character.AccountID -- kept only for the ownership
// consistency guard (AccountSnapshotReader); never surfaced in the final
// read model.
public sealed record CharacterCore(
    string Name,
    string AccountId,
    int Class,
    int CLevel,
    int Experience,
    int LevelUpPoint,
    int Strength,
    int Dexterity,
    int Vitality,
    int Energy,
    int Leadership,
    int Money,
    int MapNumber,
    int MapPosX,
    int MapPosY,
    int PkCount,
    int PkLevel,
    int PkTime,
    int CtlCode,
    int ResetCount,
    int MasterResetCount
);
