namespace BloodMoon.GameBridgeAgent.GameDatabase;

// Pure, DB-free logic extracted from SqlServerGameDatabaseReader so
// "empty slots are skipped" and "GameIDC is never an 11th slot" are
// directly unit-testable without a database connection.
public static class AccountCharacterSlotsBuilder
{
    public static AccountCharacterSlots Build(string id, IReadOnlyList<string?> gameIdSlots, string? gameIdc)
    {
        if (gameIdSlots.Count != 10)
        {
            throw new ArgumentException("Exactly 10 GameID slot values are expected (GameID1..GameID10).", nameof(gameIdSlots));
        }

        var slots = new List<CharacterSlotRef>();
        for (var i = 0; i < gameIdSlots.Count; i++)
        {
            var value = gameIdSlots[i];
            if (!string.IsNullOrEmpty(value))
            {
                slots.Add(new CharacterSlotRef(i + 1, value)); // slot numbers are 1-based: GameID1 -> 1
            }
        }

        var activeCharacterName = string.IsNullOrEmpty(gameIdc) ? null : gameIdc;
        return new AccountCharacterSlots(id, slots, activeCharacterName);
    }
}
