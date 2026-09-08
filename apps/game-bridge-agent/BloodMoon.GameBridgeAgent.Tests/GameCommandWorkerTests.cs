using System.Text.Json;
using BloodMoon.GameBridgeAgent.Commands;
using BloodMoon.GameBridgeAgent.Configuration;
using BloodMoon.GameBridgeAgent.GameDatabase;
using BloodMoon.GameBridgeAgent.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace BloodMoon.GameBridgeAgent.Tests;

// GameBridge extension plan Part 14/17: proves the kill-switch dispatch
// logic in GameCommandWorker.ExecuteClaimedAsync -- a layer above
// GameCommandProcessorTests, which already covers per-operation
// idempotency/validation. This file covers what's new to the worker
// itself: routing by CommandType, the four independent enable flags, and
// COMMAND_TYPE_DISABLED vs COMMAND_TYPE_DENIED.
public sealed class GameCommandWorkerTests
{
    private const string Environment = "test-env";
    private const string ServerId = "test-server";

    [Fact]
    public async Task GrantVip_disabled_by_default_reports_COMMAND_TYPE_DISABLED_without_touching_the_writer()
    {
        var (worker, transport, writer, _) = Build(new AgentOptions { CommandEnvironment = Environment, ServerId = ServerId });

        await worker.ExecuteClaimedAsync(ClaimedVip("GRANT_VIP", JsonPayload("""{"targetLevel":2,"vipExpiresAt":"2029-01-01T00:00:00Z"}""")), CancellationToken.None);

        Assert.Equal(0, writer.GrantVipCallCount);
        Assert.Single(transport.Reports);
        Assert.Equal("FAILED_FINAL", transport.Reports[0].Status);
        Assert.Equal("COMMAND_TYPE_DISABLED", transport.Reports[0].ResultCode);
    }

    [Fact]
    public async Task GrantVip_enabled_dispatches_to_the_writer_and_reports_success()
    {
        var (worker, transport, writer, _) = Build(new AgentOptions { CommandEnvironment = Environment, ServerId = ServerId, GrantVipEnabled = true });

        await worker.ExecuteClaimedAsync(ClaimedVip("GRANT_VIP", JsonPayload("""{"targetLevel":2,"vipExpiresAt":"2029-01-01T00:00:00Z"}""")), CancellationToken.None);

        Assert.Equal(1, writer.GrantVipCallCount);
        Assert.Equal("SUCCEEDED", transport.Reports[0].Status);
        Assert.Contains("\"newLevel\":2", transport.Reports[0].DetailJson);
    }

    [Fact]
    public async Task SyncVipTier_disabled_by_default()
    {
        var (worker, transport, writer, _) = Build(new AgentOptions { CommandEnvironment = Environment, ServerId = ServerId });

        await worker.ExecuteClaimedAsync(ClaimedVip("SYNC_VIP_TIER", JsonPayload("""{"desiredLevel":0}""")), CancellationToken.None);

        Assert.Equal(0, writer.SyncVipTierCallCount);
        Assert.Equal("COMMAND_TYPE_DISABLED", transport.Reports[0].ResultCode);
    }

    [Fact]
    public async Task SyncVipTier_enabled_accepts_zero_as_desired_level()
    {
        var (worker, transport, writer, _) = Build(new AgentOptions { CommandEnvironment = Environment, ServerId = ServerId, SyncVipTierEnabled = true });

        await worker.ExecuteClaimedAsync(ClaimedVip("SYNC_VIP_TIER", JsonPayload("""{"desiredLevel":0}""")), CancellationToken.None);

        Assert.Equal(1, writer.SyncVipTierCallCount);
        Assert.Equal("SUCCEEDED", transport.Reports[0].Status);
    }

    [Fact]
    public async Task Anonymize_disabled_by_default()
    {
        var (worker, transport, writer, _) = Build(new AgentOptions { CommandEnvironment = Environment, ServerId = ServerId });

        await worker.ExecuteClaimedAsync(ClaimedNoPayload("ANONYMIZE_GAME_ACCOUNT"), CancellationToken.None);

        Assert.Equal(0, writer.AnonymizeCallCount);
        Assert.Equal("COMMAND_TYPE_DISABLED", transport.Reports[0].ResultCode);
    }

    [Fact]
    public async Task Anonymize_enabled_dispatches_and_reports_detail_json()
    {
        var (worker, transport, writer, _) = Build(new AgentOptions { CommandEnvironment = Environment, ServerId = ServerId, AnonymizeEnabled = true });

        await worker.ExecuteClaimedAsync(ClaimedNoPayload("ANONYMIZE_GAME_ACCOUNT"), CancellationToken.None);

        Assert.Equal(1, writer.AnonymizeCallCount);
        Assert.Equal("SUCCEEDED", transport.Reports[0].Status);
        Assert.NotNull(transport.Reports[0].DetailJson);
    }

    [Fact]
    public async Task Purge_disabled_by_default_even_when_others_are_enabled()
    {
        // Plan Part 14: PurgeEnabled defaults false even after the other
        // three are turned on -- the only irreversible operation gets its
        // own deliberate, separate activation.
        var (worker, transport, writer, _) = Build(new AgentOptions
        {
            CommandEnvironment = Environment, ServerId = ServerId,
            GrantVipEnabled = true, SyncVipTierEnabled = true, AnonymizeEnabled = true
        });

        await worker.ExecuteClaimedAsync(ClaimedPurge(JsonPayload("""{"betaCycleId":"cycle-2026-08"}""")), CancellationToken.None);

        Assert.Equal(0, writer.PurgeCallCount);
        Assert.Equal("COMMAND_TYPE_DISABLED", transport.Reports[0].ResultCode);
    }

    [Fact]
    public async Task Purge_enabled_requires_a_beta_cycle_id_in_the_payload()
    {
        var (worker, transport, writer, _) = Build(new AgentOptions { CommandEnvironment = Environment, ServerId = ServerId, PurgeEnabled = true });

        await worker.ExecuteClaimedAsync(ClaimedPurge(payload: null), CancellationToken.None);

        Assert.Equal(0, writer.PurgeCallCount);
        Assert.Equal("FAILED_FINAL", transport.Reports[0].Status);
        Assert.Equal("INVALID_PAYLOAD", transport.Reports[0].ResultCode);
    }

    [Fact]
    public async Task Purge_enabled_with_valid_payload_dispatches()
    {
        var (worker, transport, writer, _) = Build(new AgentOptions { CommandEnvironment = Environment, ServerId = ServerId, PurgeEnabled = true });

        await worker.ExecuteClaimedAsync(ClaimedPurge(JsonPayload("""{"betaCycleId":"cycle-2026-08"}""")), CancellationToken.None);

        Assert.Equal(1, writer.PurgeCallCount);
        Assert.Equal("SUCCEEDED", transport.Reports[0].Status);
    }

    [Fact]
    public async Task Unknown_command_type_is_denied_not_disabled()
    {
        var (worker, transport, _, _) = Build(new AgentOptions
        {
            CommandEnvironment = Environment, ServerId = ServerId,
            GrantVipEnabled = true, SyncVipTierEnabled = true, AnonymizeEnabled = true, PurgeEnabled = true
        });

        await worker.ExecuteClaimedAsync(ClaimedNoPayload("SOME_FUTURE_TYPE"), CancellationToken.None);

        Assert.Equal("COMMAND_TYPE_DENIED", transport.Reports[0].ResultCode);
    }

    [Fact]
    public async Task Scope_mismatch_is_checked_before_the_kill_switch()
    {
        var (worker, transport, writer, _) = Build(new AgentOptions { CommandEnvironment = Environment, ServerId = ServerId, GrantVipEnabled = true });
        var wrongScope = ClaimedVip("GRANT_VIP", JsonPayload("""{"targetLevel":2,"vipExpiresAt":"2029-01-01T00:00:00Z"}""")) with { Environment = "other-env" };

        await worker.ExecuteClaimedAsync(wrongScope, CancellationToken.None);

        Assert.Equal(0, writer.GrantVipCallCount);
        Assert.Equal("AGENT_SCOPE_DENIED", transport.Reports[0].ResultCode);
    }

    private static JsonElement JsonPayload(string json) => JsonDocument.Parse(json).RootElement;

    private static ClaimedGameCommand ClaimedVip(string commandType, JsonElement payload) => new(
        Guid.NewGuid().ToString(), Guid.NewGuid().ToString(), commandType, Environment, ServerId,
        "qa3c001", DateTimeOffset.UtcNow.AddHours(1), 1, DateTimeOffset.UtcNow.AddMinutes(1), null, payload);

    private static ClaimedGameCommand ClaimedPurge(JsonElement? payload) => new(
        Guid.NewGuid().ToString(), Guid.NewGuid().ToString(), "PURGE_GAME_ACCOUNT", Environment, ServerId,
        "qa3c001", DateTimeOffset.UtcNow.AddHours(1), 1, DateTimeOffset.UtcNow.AddMinutes(1), null, payload);

    private static ClaimedGameCommand ClaimedNoPayload(string commandType) => new(
        Guid.NewGuid().ToString(), Guid.NewGuid().ToString(), commandType, Environment, ServerId,
        "qa3c001", DateTimeOffset.UtcNow.AddHours(1), 1, DateTimeOffset.UtcNow.AddMinutes(1), null, null);

    private static (GameCommandWorker Worker, FakeGameCommandTransport Transport, FakeWriter Writer, ProvisioningLedger Ledger) Build(AgentOptions options)
    {
        var transport = new FakeGameCommandTransport();
        var writer = new FakeWriter();
        var ledgerPath = Path.Combine(Path.GetTempPath(), $"bloodmoon-gamebridge-worker-test-{Guid.NewGuid():N}.sqlite3");
        var ledger = new ProvisioningLedger(ledgerPath);
        ledger.InitializeAsync(CancellationToken.None).GetAwaiter().GetResult();
        var processor = new GameCommandProcessor(writer, ledger);
        var decryptor = new GameCredentialDecryptor(new NoKeys());
        var worker = new GameCommandWorker(transport, processor, ledger, decryptor, Options.Create(options), NullLogger<GameCommandWorker>.Instance);
        return (worker, transport, writer, ledger);
    }

    private sealed class NoKeys : IGameCredentialKeyProvider
    {
        public byte[] GetKey(string version) => throw new System.Security.Cryptography.CryptographicException("CREDENTIAL_KEY_VERSION_UNAVAILABLE");
    }

    // Minimal fake covering only the four new writer methods -- kept
    // separate from GameCommandProcessorTests.FakeWriter (that one is
    // private to its own test class and already covers CreateGameAccountAsync
    // plus richer MAX()/desired-state behavior for the processor-level
    // tests). This one is intentionally simpler: GameCommandWorkerTests only
    // needs to prove dispatch/kill-switch routing, not re-prove idempotency
    // math already covered one layer down.
    private sealed class FakeWriter : IGameDatabaseWriter
    {
        public int GrantVipCallCount { get; private set; }
        public int SyncVipTierCallCount { get; private set; }
        public int AnonymizeCallCount { get; private set; }
        public int PurgeCallCount { get; private set; }

        public Task<CreateGameAccountResult> CreateGameAccountAsync(string legacyLogin, string gameCredential, CancellationToken ct) =>
            Task.FromResult(new CreateGameAccountResult("SUCCEEDED", 1));

        public Task<GrantVipResult> GrantVipAsync(string legacyLogin, int targetLevel, DateTime expiresAt, Guid commandId, Guid correlationId, CancellationToken ct)
        {
            GrantVipCallCount++;
            return Task.FromResult(new GrantVipResult("SUCCEEDED", 0, targetLevel));
        }

        public Task<SyncVipTierResult> SyncVipTierAsync(string legacyLogin, int desiredLevel, DateTime? desiredExpiresAt, Guid commandId, Guid correlationId, CancellationToken ct)
        {
            SyncVipTierCallCount++;
            return Task.FromResult(new SyncVipTierResult("SUCCEEDED", 0, desiredLevel, desiredLevel != 0));
        }

        public Task<AnonymizeGameAccountResult> AnonymizeGameAccountAsync(string legacyLogin, Guid commandId, Guid correlationId, CancellationToken ct)
        {
            AnonymizeCallCount++;
            return Task.FromResult(new AnonymizeGameAccountResult("SUCCEEDED", """{"character":1}"""));
        }

        public Task<PurgeGameAccountResult> PurgeGameAccountAsync(string legacyLogin, string betaCycleId, Guid commandId, Guid correlationId, CancellationToken ct)
        {
            PurgeCallCount++;
            return Task.FromResult(new PurgeGameAccountResult("SUCCEEDED", """{"membInfo":1}"""));
        }
    }
}
