using BloodMoon.GameBridgeAgent.Commands;
using BloodMoon.GameBridgeAgent.GameDatabase;
using Xunit;

namespace BloodMoon.GameBridgeAgent.Tests;

public sealed class GameCommandProcessorTests
{
    [Fact]
    public async Task Same_command_replays_persisted_result_without_second_write()
    {
        await using var fixture = await TestFixture.CreateAsync();
        var command = NewCommand();

        var first = await fixture.Processor.ExecuteAsync(command, CancellationToken.None);
        var replay = await fixture.Processor.ExecuteAsync(command, CancellationToken.None);

        Assert.Equal(1, fixture.Writer.CallCount);
        Assert.False(first.Replayed);
        Assert.True(replay.Replayed);
        Assert.Equal(first.MembGuid, replay.MembGuid);
    }

    [Fact]
    public async Task Same_request_with_changed_payload_is_rejected()
    {
        await using var fixture = await TestFixture.CreateAsync();
        var command = NewCommand();
        await fixture.Processor.ExecuteAsync(command, CancellationToken.None);

        var changed = command with { GameCredential = "Z9y8X7w6V5" };
        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => fixture.Processor.ExecuteAsync(changed, CancellationToken.None));

        Assert.Equal("IDEMPOTENCY_CONFLICT", error.Message);
        Assert.Equal(1, fixture.Writer.CallCount);
    }

    [Fact]
    public async Task Concurrent_same_request_has_one_writer_execution()
    {
        await using var fixture = await TestFixture.CreateAsync(blockWriter: true);
        var command = NewCommand();
        var first = fixture.Processor.ExecuteAsync(command, CancellationToken.None);
        await fixture.Writer.Entered.Task.WaitAsync(TimeSpan.FromSeconds(5));

        var secondError = await Assert.ThrowsAsync<InvalidOperationException>(
            () => fixture.Processor.ExecuteAsync(command, CancellationToken.None));
        fixture.Writer.Release.TrySetResult();
        await first;

        Assert.Equal("COMMAND_IN_PROGRESS", secondError.Message);
        Assert.Equal(1, fixture.Writer.CallCount);
    }

    [Theory]
    [InlineData("RAW_SQL")]
    [InlineData("CHANGE_GAME_CREDENTIAL")]
    [InlineData("ACCOUNT_STATUS_CHANGE")]
    public async Task Non_allowlisted_command_types_are_denied(string commandType)
    {
        await using var fixture = await TestFixture.CreateAsync();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => fixture.Processor.ExecuteAsync(NewCommand() with { CommandType = commandType }, CancellationToken.None));

        Assert.Equal("COMMAND_TYPE_DENIED", error.Message);
        Assert.Equal(0, fixture.Writer.CallCount);
    }

    [Fact]
    public async Task Null_payload_fields_are_rejected_before_the_writer()
    {
        await using var fixture = await TestFixture.CreateAsync();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => fixture.Processor.ExecuteAsync(NewCommand() with { LegacyLogin = null! }, CancellationToken.None));

        Assert.Equal("INVALID_PAYLOAD", error.Message);
        Assert.Equal(0, fixture.Writer.CallCount);
    }

    // ---- GRANT_VIP (plan Part 3/12) -----------------------------------

    [Fact]
    public async Task GrantVip_max_rule_keeps_the_higher_tier()
    {
        await using var fixture = await TestFixture.CreateAsync();
        await fixture.Processor.ExecuteAsync(NewGrantVipCommand("qa3c002", targetLevel: 3), CancellationToken.None);

        var lower = await fixture.Processor.ExecuteAsync(NewGrantVipCommand("qa3c002", targetLevel: 1), CancellationToken.None);

        Assert.Equal(3, lower.NewLevel);
        Assert.Equal(2, fixture.Writer.GrantVipCallCount);
    }

    [Fact]
    public async Task GrantVip_same_command_replays_without_second_write()
    {
        await using var fixture = await TestFixture.CreateAsync();
        var command = NewGrantVipCommand("qa3c003", targetLevel: 2);

        var first = await fixture.Processor.ExecuteAsync(command, CancellationToken.None);
        var replay = await fixture.Processor.ExecuteAsync(command, CancellationToken.None);

        Assert.Equal(1, fixture.Writer.GrantVipCallCount);
        Assert.False(first.Replayed);
        Assert.True(replay.Replayed);
        Assert.Equal(first.NewLevel, replay.NewLevel);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(4)]
    public async Task GrantVip_rejects_out_of_range_target_level(int targetLevel)
    {
        await using var fixture = await TestFixture.CreateAsync();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => fixture.Processor.ExecuteAsync(NewGrantVipCommand("qa3c004", targetLevel), CancellationToken.None));

        Assert.Equal("INVALID_PAYLOAD", error.Message);
        Assert.Equal(0, fixture.Writer.GrantVipCallCount);
    }

    [Fact]
    public async Task GrantVip_wrong_command_type_is_denied()
    {
        await using var fixture = await TestFixture.CreateAsync();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => fixture.Processor.ExecuteAsync(NewGrantVipCommand("qa3c005", 2) with { CommandType = "SOMETHING_ELSE" }, CancellationToken.None));

        Assert.Equal("COMMAND_TYPE_DENIED", error.Message);
    }

    // ---- SYNC_VIP_TIER (plan Part 3B/12) -------------------------------

    [Fact]
    public async Task SyncVipTier_can_lower_the_tier_unlike_GrantVip()
    {
        await using var fixture = await TestFixture.CreateAsync();
        await fixture.Processor.ExecuteAsync(NewGrantVipCommand("qa3c006", targetLevel: 3), CancellationToken.None);

        var synced = await fixture.Processor.ExecuteAsync(NewSyncVipTierCommand("qa3c006", desiredLevel: 0), CancellationToken.None);

        Assert.Equal(0, synced.NewLevel);
        Assert.True(synced.Changed);
    }

    [Fact]
    public async Task SyncVipTier_already_at_desired_level_is_a_safe_noop()
    {
        await using var fixture = await TestFixture.CreateAsync();
        await fixture.Processor.ExecuteAsync(NewSyncVipTierCommand("qa3c007", desiredLevel: 2), CancellationToken.None);

        var second = await fixture.Processor.ExecuteAsync(NewSyncVipTierCommand("qa3c007", desiredLevel: 2) with { CommandId = Guid.NewGuid().ToString(), ProvisioningRequestId = Guid.NewGuid().ToString() }, CancellationToken.None);

        Assert.False(second.Changed);
        Assert.Equal(2, fixture.Writer.SyncVipTierCallCount);
    }

    [Fact]
    public async Task SyncVipTier_accepts_zero_as_a_valid_desired_level()
    {
        await using var fixture = await TestFixture.CreateAsync();
        var result = await fixture.Processor.ExecuteAsync(NewSyncVipTierCommand("qa3c008", desiredLevel: 0), CancellationToken.None);

        Assert.Equal(0, result.NewLevel);
        Assert.Equal("SUCCEEDED", result.ResultCode);
    }

    [Fact]
    public async Task SyncVipTier_rejects_out_of_range_desired_level()
    {
        await using var fixture = await TestFixture.CreateAsync();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => fixture.Processor.ExecuteAsync(NewSyncVipTierCommand("qa3c009", desiredLevel: 4), CancellationToken.None));

        Assert.Equal("INVALID_PAYLOAD", error.Message);
    }

    // ---- ANONYMIZE_GAME_ACCOUNT (plan Part 4/12) -----------------------

    [Fact]
    public async Task Anonymize_same_command_replays_without_second_write()
    {
        await using var fixture = await TestFixture.CreateAsync();
        var command = NewAnonymizeCommand("qa3c010");

        var first = await fixture.Processor.ExecuteAsync(command, CancellationToken.None);
        var replay = await fixture.Processor.ExecuteAsync(command, CancellationToken.None);

        Assert.Equal(1, fixture.Writer.AnonymizeCallCount);
        Assert.False(first.Replayed);
        Assert.True(replay.Replayed);
        Assert.Equal(first.DetailJson, replay.DetailJson);
    }

    [Fact]
    public async Task Anonymize_wrong_command_type_is_denied()
    {
        await using var fixture = await TestFixture.CreateAsync();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => fixture.Processor.ExecuteAsync(NewAnonymizeCommand("qa3c011") with { CommandType = "PURGE_GAME_ACCOUNT" }, CancellationToken.None));

        Assert.Equal("COMMAND_TYPE_DENIED", error.Message);
        Assert.Equal(0, fixture.Writer.AnonymizeCallCount);
    }

    [Fact]
    public async Task Anonymize_invalid_legacy_login_is_rejected_before_the_writer()
    {
        await using var fixture = await TestFixture.CreateAsync();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => fixture.Processor.ExecuteAsync(NewAnonymizeCommand("ab") /* too short */, CancellationToken.None));

        Assert.Equal("INVALID_PAYLOAD", error.Message);
        Assert.Equal(0, fixture.Writer.AnonymizeCallCount);
    }

    // ---- PURGE_GAME_ACCOUNT (plan Part 5/12) ---------------------------

    [Fact]
    public async Task Purge_same_command_replays_without_second_write()
    {
        await using var fixture = await TestFixture.CreateAsync();
        var command = NewPurgeCommand("qa3c012", "cycle-2026-08");

        var first = await fixture.Processor.ExecuteAsync(command, CancellationToken.None);
        var replay = await fixture.Processor.ExecuteAsync(command, CancellationToken.None);

        Assert.Equal(1, fixture.Writer.PurgeCallCount);
        Assert.False(first.Replayed);
        Assert.True(replay.Replayed);
    }

    [Fact]
    public async Task Purge_requires_a_non_empty_beta_cycle_id()
    {
        await using var fixture = await TestFixture.CreateAsync();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => fixture.Processor.ExecuteAsync(NewPurgeCommand("qa3c013", ""), CancellationToken.None));

        Assert.Equal("INVALID_PAYLOAD", error.Message);
        Assert.Equal(0, fixture.Writer.PurgeCallCount);
    }

    [Fact]
    public async Task Purge_wrong_command_type_is_denied()
    {
        await using var fixture = await TestFixture.CreateAsync();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => fixture.Processor.ExecuteAsync(NewPurgeCommand("qa3c014", "cycle-2026-08") with { CommandType = "ANONYMIZE_GAME_ACCOUNT" }, CancellationToken.None));

        Assert.Equal("COMMAND_TYPE_DENIED", error.Message);
    }

    // ---- Shared command builders ----------------------------------------

    private static CreateGameAccountCommand NewCommand() => new(
        Guid.NewGuid().ToString(),
        Guid.NewGuid().ToString(),
        "CREATE_GAME_ACCOUNT",
        "qa3c001",
        "A2b3C4d5E6");

    private static GrantVipCommand NewGrantVipCommand(string legacyLogin, int targetLevel) => new(
        Guid.NewGuid().ToString(), Guid.NewGuid().ToString(), "GRANT_VIP", legacyLogin, targetLevel);

    private static SyncVipTierCommand NewSyncVipTierCommand(string legacyLogin, int desiredLevel) => new(
        Guid.NewGuid().ToString(), Guid.NewGuid().ToString(), "SYNC_VIP_TIER", legacyLogin, desiredLevel);

    private static AnonymizeGameAccountCommand NewAnonymizeCommand(string legacyLogin) => new(
        Guid.NewGuid().ToString(), Guid.NewGuid().ToString(), "ANONYMIZE_GAME_ACCOUNT", legacyLogin);

    private static PurgeGameAccountCommand NewPurgeCommand(string legacyLogin, string betaCycleId) => new(
        Guid.NewGuid().ToString(), Guid.NewGuid().ToString(), "PURGE_GAME_ACCOUNT", legacyLogin, betaCycleId);

    private sealed class FakeWriter(bool blockWriter) : IGameDatabaseWriter
    {
        private int _callCount;
        // GameBridge extension plan Part 12 -- per-operation call counts so
        // GrantVipProcessorTests/SyncVipTierProcessorTests/etc. can assert
        // "exactly one real write happened" independently of each other and
        // of CREATE_GAME_ACCOUNT's own counter.
        private int _grantVipCallCount;
        private int _syncVipTierCallCount;
        private int _anonymizeCallCount;
        private int _purgeCallCount;
        // Tracks the highest AccountLevel ever granted per account, so the
        // fake can honestly reproduce bm_GrantVip's MAX() rule (Plan Part 3)
        // instead of always returning whatever the test happened to ask for.
        private readonly Dictionary<string, int> _accountLevels = new();

        public int CallCount => _callCount;
        public int GrantVipCallCount => _grantVipCallCount;
        public int SyncVipTierCallCount => _syncVipTierCallCount;
        public int AnonymizeCallCount => _anonymizeCallCount;
        public int PurgeCallCount => _purgeCallCount;
        public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public async Task<CreateGameAccountResult> CreateGameAccountAsync(string legacyLogin, string gameCredential, CancellationToken ct)
        {
            Interlocked.Increment(ref _callCount);
            Entered.TrySetResult();
            if (blockWriter)
            {
                await Release.Task.WaitAsync(ct);
            }
            return new("SUCCEEDED", 4242);
        }

        public async Task<GrantVipResult> GrantVipAsync(string legacyLogin, int targetLevel, CancellationToken ct)
        {
            Interlocked.Increment(ref _grantVipCallCount);
            Entered.TrySetResult();
            if (blockWriter) await Release.Task.WaitAsync(ct);
            var previous = _accountLevels.GetValueOrDefault(legacyLogin, 0);
            var newLevel = Math.Max(previous, targetLevel);
            _accountLevels[legacyLogin] = newLevel;
            return new("SUCCEEDED", previous, newLevel);
        }

        public async Task<SyncVipTierResult> SyncVipTierAsync(string legacyLogin, int desiredLevel, CancellationToken ct)
        {
            Interlocked.Increment(ref _syncVipTierCallCount);
            Entered.TrySetResult();
            if (blockWriter) await Release.Task.WaitAsync(ct);
            var previous = _accountLevels.GetValueOrDefault(legacyLogin, 0);
            _accountLevels[legacyLogin] = desiredLevel;
            return new("SUCCEEDED", previous, desiredLevel, previous != desiredLevel);
        }

        public async Task<AnonymizeGameAccountResult> AnonymizeGameAccountAsync(string legacyLogin, CancellationToken ct)
        {
            Interlocked.Increment(ref _anonymizeCallCount);
            Entered.TrySetResult();
            if (blockWriter) await Release.Task.WaitAsync(ct);
            return new("SUCCEEDED", """{"character":1,"guildMember":0,"warehouse":true}""");
        }

        public async Task<PurgeGameAccountResult> PurgeGameAccountAsync(string legacyLogin, string betaCycleId, CancellationToken ct)
        {
            Interlocked.Increment(ref _purgeCallCount);
            Entered.TrySetResult();
            if (blockWriter) await Release.Task.WaitAsync(ct);
            return new("SUCCEEDED", """{"membInfo":1,"character":1}""");
        }
    }

    private sealed class TestFixture(string directory, FakeWriter writer, GameCommandProcessor processor) : IAsyncDisposable
    {
        public FakeWriter Writer { get; } = writer;
        public GameCommandProcessor Processor { get; } = processor;

        public static async Task<TestFixture> CreateAsync(bool blockWriter = false)
        {
            var directory = Path.Combine(Path.GetTempPath(), $"bloodmoon-phase3c-{Guid.NewGuid():N}");
            Directory.CreateDirectory(directory);
            var ledger = new ProvisioningLedger(Path.Combine(directory, "ledger.sqlite3"));
            await ledger.InitializeAsync(CancellationToken.None);
            var writer = new FakeWriter(blockWriter);
            return new(directory, writer, new GameCommandProcessor(writer, ledger));
        }

        public ValueTask DisposeAsync()
        {
            Directory.Delete(directory, recursive: true);
            return ValueTask.CompletedTask;
        }
    }
}
