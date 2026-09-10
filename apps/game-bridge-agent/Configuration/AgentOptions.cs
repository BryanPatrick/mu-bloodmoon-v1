namespace BloodMoon.GameBridgeAgent.Configuration;

// Bound from the "Agent" configuration section. Real values for
// WorkerBaseUrl/HmacSecret/SqlServerConnectionString come from environment
// variables (BLOODMOON_AGENT_Agent__*) or a local, gitignored config file --
// never committed. See appsettings.example.json.
public sealed class AgentOptions
{
    public const string SectionName = "Agent";

    public string AgentId { get; set; } = "";
    public string ServerId { get; set; } = "";
    public string WorkerBaseUrl { get; set; } = "";
    public string HmacSecret { get; set; } = "";
    public string CommandHmacSecret { get; set; } = "";
    public string CommandEnvironment { get; set; } = "production";
    public string SqlServerConnectionString { get; set; } = "";
    public string SqlServerWriterConnectionString { get; set; } = "";
    public int PollIntervalSeconds { get; set; } = 30;
    public int HeartbeatIntervalSeconds { get; set; } = 60;
    public int OutboxPendingHardCap { get; set; } = 500;
    public string LocalStorePath { get; set; } = "data/agent-local-store.sqlite3";
    public string ProvisioningLedgerPath { get; set; } = "data/provisioning-ledger.sqlite3";
    public string GameCredentialKeyRingPath { get; set; } = "secrets/game-credential-keys.dpapi.json";
    public int CommandPollIntervalSeconds { get; set; } = 10;
    public int CommandMaxBackoffSeconds { get; set; } = 120;

    // GameBridge extension plan Part 14 -- four independent kill switches,
    // not one global switch, so disabling one operation never forces
    // disabling the already-production-proven CREATE_GAME_ACCOUNT path.
    // Deliberately default false: enabling any of these is a separate,
    // explicit decision from "the code compiles/deploys" -- see
    // docs/gamebridge/gamebridge-agent-extension-plan.md Part 14.
    // PurgeEnabled defaults false even after the others are turned on,
    // per Bryan's decision (it's the only irreversible operation).
    public bool GrantVipEnabled { get; set; } = false;
    public bool SyncVipTierEnabled { get; set; } = false;
    public bool AnonymizeEnabled { get; set; } = false;
    public bool PurgeEnabled { get; set; } = false;
}
