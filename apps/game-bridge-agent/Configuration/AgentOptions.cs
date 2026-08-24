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
    public string SqlServerConnectionString { get; set; } = "";
    public string SqlServerWriterConnectionString { get; set; } = "";
    public int PollIntervalSeconds { get; set; } = 30;
    public int HeartbeatIntervalSeconds { get; set; } = 60;
    public int OutboxPendingHardCap { get; set; } = 500;
    public string LocalStorePath { get; set; } = "data/agent-local-store.sqlite3";
}
