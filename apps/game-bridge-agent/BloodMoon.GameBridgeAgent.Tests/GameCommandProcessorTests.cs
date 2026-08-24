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

    private static CreateGameAccountCommand NewCommand() => new(
        Guid.NewGuid().ToString(),
        Guid.NewGuid().ToString(),
        "CREATE_GAME_ACCOUNT",
        "qa3c001",
        "A2b3C4d5E6");

    private sealed class FakeWriter(bool blockWriter) : IGameDatabaseWriter
    {
        private int _callCount;
        public int CallCount => _callCount;
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
