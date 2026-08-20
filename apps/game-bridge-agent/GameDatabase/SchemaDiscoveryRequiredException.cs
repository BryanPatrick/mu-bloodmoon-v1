namespace BloodMoon.GameBridgeAgent.GameDatabase;

// Thrown by SqlServerGameDatabaseReader instead of executing a query built
// on a guessed column name. A real query may only be written once every
// column it needs is confirmed in docs/game-data/schema/ -- see
// docs/game-data/schema/join-keys-unknown.md for the current catalog.
public sealed class SchemaDiscoveryRequiredException : Exception
{
    public string Operation { get; }

    public IReadOnlyList<string> MissingColumns { get; }

    public SchemaDiscoveryRequiredException(string operation, IReadOnlyList<string> missingColumns)
        : base(BuildMessage(operation, missingColumns))
    {
        Operation = operation;
        MissingColumns = missingColumns;
    }

    private static string BuildMessage(string operation, IReadOnlyList<string> missingColumns) =>
        $"{operation} is BLOCKED_BY_SCHEMA_DISCOVERY. SCHEMA_REQUIRED_BUT_UNKNOWN: {string.Join(", ", missingColumns)}. " +
        "See docs/game-data/schema/join-keys-unknown.md -- these columns must be confirmed by a real, read-only schema " +
        "discovery pass against the live database before this query may be written.";
}
