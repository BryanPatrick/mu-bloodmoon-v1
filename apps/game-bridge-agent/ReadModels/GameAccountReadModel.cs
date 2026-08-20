using BloodMoon.GameBridgeAgent.GameDatabase;

namespace BloodMoon.GameBridgeAgent.ReadModels;

// The final, output-safe shape. AccountId here is MEMB_INFO.memb_guid --
// the canonical identity (Part J/K) -- never memb___id, which never
// appears anywhere in this file's types. Adapted to this project's own
// record/nullable-field conventions rather than copied from any external
// template.
public sealed record GameAccountReadModel(
    int AccountId,
    bool? Online, // MEMB_STAT.ConnectStat; null = no MEMB_STAT row (unknown, never assumed offline)
    string? ActiveCharacterName, // GameIDC
    IReadOnlyList<CharacterSnapshot> Characters, // preserves real GameID1..GameID10 slot order, never re-sorted
    CashShopBalances? CashShop,
    int? WarehouseMoney
);

public sealed record CharacterSnapshot(
    int Slot,
    string Name,
    int Class,
    int Level,
    int Experience,
    int LevelUpPoint,
    CharacterStats Stats,
    int Money,
    CharacterLocation Location,
    CharacterPk Pk,
    int CtlCode,
    int ResetCount,
    int MasterResetCount,
    int? MasterLevel, // null = no MasterSkillTree row ("never trained"), never assumed 0
    GuildMembershipInfo? Guild, // null = not in a guild
    CharacterRankings Rankings
);

public sealed record CharacterStats(int Strength, int Dexterity, int Vitality, int Energy, int Leadership);

public sealed record CharacterLocation(int MapNumber, int MapPosX, int MapPosY);

public sealed record CharacterPk(int Count, int Level, int Time);
