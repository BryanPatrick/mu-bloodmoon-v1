using BloodMoon.GameBridgeAgent.GameDatabase;

namespace BloodMoon.GameBridgeAgent.ReadModels;

// Composes IGameDatabaseReader's granular real reads into one account
// snapshot. AccountCharacter is the primary ownership source (Part B --
// validated 100% consistent at current scale, see
// docs/game-data/account-identity.md); Character.AccountID is used only as
// an independent consistency guard, never as the primary source of truth.
//
// The account-character-slots -> per-character enrichment fan-out
// (MasterLevel/Guild/Rankings) is bounded at 10 real database round trips
// per category (the real, confirmed slot limit) -- deliberately not
// batched into a single wider query yet. That would be a reasonable
// future optimization if this reader is ever used for bulk/continuous
// polling; for a single-account snapshot it is unnecessary complexity now
// (Part O).
public sealed class AccountSnapshotReader
{
    private readonly IGameDatabaseReader _reader;

    public AccountSnapshotReader(IGameDatabaseReader reader)
    {
        _reader = reader;
    }

    public async Task<AccountSnapshotResult> GetAccountSnapshotAsync(int membGuid, CancellationToken cancellationToken)
    {
        var account = await _reader.GetAccountByMembGuidAsync(membGuid, cancellationToken);
        if (account is null)
        {
            return AccountSnapshotResult.AccountNotFound();
        }

        var accountCharacter = await _reader.GetAccountCharacterSlotsAsync(account.MembId, cancellationToken);
        if (accountCharacter is null)
        {
            // Every account currently has an AccountCharacter row (100%
            // coverage, confirmed) -- a resolved account without one is a
            // genuine anomaly, not "zero characters" (that case is an
            // AccountCharacter row whose slots are all empty, handled
            // below as a normal empty Characters list).
            return AccountSnapshotResult.Inconsistent(
                $"AccountCharacter row missing for a resolved MEMB_INFO account (memb_guid={membGuid}).");
        }

        if (accountCharacter.Slots.Count == 0)
        {
            var onlineEarly = await _reader.GetAccountOnlineStatusAsync(account.MembId, cancellationToken);
            var cashShopEarly = await _reader.GetCashShopBalancesAsync(account.MembId, cancellationToken);
            var warehouseMoneyEarly = await _reader.GetWarehouseMoneyAsync(account.MembId, cancellationToken);
            return AccountSnapshotResult.Ok(new GameAccountReadModel(
                membGuid, onlineEarly, accountCharacter.ActiveCharacterName, [], cashShopEarly, warehouseMoneyEarly));
        }

        var uniqueNames = accountCharacter.Slots.Select(s => s.CharacterName).Distinct().ToList();
        var characters = await _reader.GetCharactersByNamesAsync(uniqueNames, cancellationToken);
        var byName = characters.ToDictionary(c => c.Name);

        var orphanSlotCount = accountCharacter.Slots.Count(s => !byName.ContainsKey(s.CharacterName));
        if (orphanSlotCount > 0)
        {
            return AccountSnapshotResult.Inconsistent(
                $"{orphanSlotCount} AccountCharacter slot(s) reference a character name with no matching Character row.");
        }

        var mismatchedSlotCount = accountCharacter.Slots.Count(s =>
            !string.Equals(byName[s.CharacterName].AccountId, account.MembId, StringComparison.OrdinalIgnoreCase));
        if (mismatchedSlotCount > 0)
        {
            // Part N: never "correct" this silently. Fail the whole
            // snapshot -- safety over a possibly-incorrect ownership
            // answer.
            return AccountSnapshotResult.Inconsistent(
                $"{mismatchedSlotCount} character(s) have a Character.AccountID that does not match this account's memb___id bridge.");
        }

        var online = await _reader.GetAccountOnlineStatusAsync(account.MembId, cancellationToken);
        var cashShop = await _reader.GetCashShopBalancesAsync(account.MembId, cancellationToken);
        var warehouseMoney = await _reader.GetWarehouseMoneyAsync(account.MembId, cancellationToken);

        var snapshots = new List<CharacterSnapshot>();
        foreach (var slot in accountCharacter.Slots) // preserves real GameID1..GameID10 order -- never re-sorted
        {
            var character = byName[slot.CharacterName];
            var masterLevel = await _reader.GetMasterLevelAsync(character.Name, cancellationToken);
            var guild = await _reader.GetGuildMembershipAsync(character.Name, cancellationToken);
            var rankings = await _reader.GetRankingsForCharacterAsync(character.Name, cancellationToken);

            snapshots.Add(new CharacterSnapshot(
                Slot: slot.SlotNumber,
                Name: character.Name,
                Class: character.Class,
                Level: character.CLevel,
                Experience: character.Experience,
                LevelUpPoint: character.LevelUpPoint,
                Stats: new CharacterStats(character.Strength, character.Dexterity, character.Vitality, character.Energy, character.Leadership),
                Money: character.Money,
                Location: new CharacterLocation(character.MapNumber, character.MapPosX, character.MapPosY),
                Pk: new CharacterPk(character.PkCount, character.PkLevel, character.PkTime),
                CtlCode: character.CtlCode,
                ResetCount: character.ResetCount,
                MasterResetCount: character.MasterResetCount,
                MasterLevel: masterLevel,
                Guild: guild,
                Rankings: rankings));
        }

        var model = new GameAccountReadModel(membGuid, online, accountCharacter.ActiveCharacterName, snapshots, cashShop, warehouseMoney);
        return AccountSnapshotResult.Ok(model);
    }
}
