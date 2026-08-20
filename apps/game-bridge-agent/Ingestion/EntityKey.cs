namespace BloodMoon.GameBridgeAgent.Ingestion;

// The stable identity ChangeDetector/AgentLocalStore track "last observed
// state" against -- one row per tracked entity, not per event.
public static class EntityKey
{
    public static string ForCharacterReset(string characterId) => $"character-reset:{characterId}";

    public static string ForRanking(string leaderboard, string characterId) => $"ranking:{leaderboard}:{characterId}";
}
