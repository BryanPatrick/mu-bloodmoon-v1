using System.Data;
using BloodMoon.GameBridgeAgent.GameDatabase;
using Microsoft.Data.SqlClient;
using Xunit;

namespace BloodMoon.GameBridgeAgent.Tests;

// GameBridge extension plan (docs/gamebridge/gamebridge-agent-extension-plan.md)
// Part 12/13, decision F. Real integration tests against the disposable
// local SQL Server 2022 Developer Edition instance Bryan installed
// 2026-08-30 (docs/environment/sql-server-test-environment.md). Uses the
// REAL SqlServerGameDatabaseWriter -- the actual Agent component that
// talks to SQL Server -- connected via the real bloodmoon_writer_local
// least-privilege login (EXECUTE-only on the four procedures, DENY on the
// whole schema, verified separately via
// references/.../gamebridge-extension-20260830/derived/local-writer-smoke-test.sql).
//
// Conditionally runs only when GAMEBRIDGE_LOCAL_SQL_TEST_CONNECTION is set
// (a full ADO.NET connection string for bloodmoon_writer_local against
// bloodmoon_gamebridge_test) -- silently no-ops otherwise (xUnit 2.9 has
// no built-in runtime Assert.Skip; this is the standard vanilla-xUnit
// pattern for an optional integration suite, documented explicitly here
// rather than left as an unexplained early return). Never touches
// production -- this connection string can only ever point at a local,
// disposable database by construction (this repo has no production SQL
// Server credential anywhere).
public sealed class SqlServerLocalIntegrationTests
{
    // GAMEBRIDGE_LOCAL_SQL_TEST_CONNECTION is the real bloodmoon_writer_local
    // connection (EXECUTE-only, DENY on the whole schema) -- this is what
    // SqlServerGameDatabaseWriter (the code under test) connects with, on
    // purpose, so these tests prove the four procedures work under the
    // ACTUAL least-privilege grant model, not under a sysadmin bypass.
    // GAMEBRIDGE_LOCAL_SQL_ADMIN_CONNECTION is a separate, unrestricted
    // (Windows-auth sysadmin) connection used ONLY by this test file's own
    // fixture setup and state-verification helpers below -- never by the
    // writer under test. Seeding fixtures through the restricted
    // connection is not a workaround to avoid (a real first attempt at
    // this file tried exactly that and correctly got INSERT permission
    // denied -- proof the DENY grant works, and the reason this split
    // exists).
    private static readonly string? ConnectionString = Environment.GetEnvironmentVariable("GAMEBRIDGE_LOCAL_SQL_TEST_CONNECTION");
    private static readonly string? AdminConnectionString = Environment.GetEnvironmentVariable("GAMEBRIDGE_LOCAL_SQL_ADMIN_CONNECTION");

    private static bool Skip => ConnectionString is null || AdminConnectionString is null;

    private static SqlServerGameDatabaseWriter NewWriter() => new(ConnectionString!);

    private static string UniqueLogin(string prefix) => (prefix + Guid.NewGuid().ToString("N")).Substring(0, 10);

    // Phase L fix: bm_GrantVip/bm_SyncVipTier now require a real
    // MEMB_INFO.AccountExpireDate write (see the SQL source files' own
    // "PHASE L FIX" header comments) -- a fixed future instant is
    // sufficient for every test below that doesn't specifically exercise
    // expiry itself. MUST stay within SMALLDATETIME's real range (the
    // real AccountExpireDate column type, confirmed via sys.columns) --
    // 2029, not some far-future year like 2099, which overflows it
    // (max is 2079-06-06; found via a real MU_TRANSACTION_FAILED this
    // round -- see docs/vip/wz-setaccountlevel-coexistence.md).
    private static readonly DateTime FutureExpiry = new(2029, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    private static async Task SeedAccountAsync(string legacyLogin, int accountLevel = 0, int admin = 0)
    {
        await using var connection = new SqlConnection(AdminConnectionString);
        await connection.OpenAsync();
        await using var cmd = new SqlCommand(
            "INSERT INTO MEMB_INFO (memb___id, memb__pwd, memb_name, sno__numb, AccountLevel, Admin) VALUES (@id, @pw, @id, @sno, @lvl, @admin)",
            connection);
        cmd.Parameters.AddWithValue("@id", legacyLogin);
        cmd.Parameters.AddWithValue("@pw", "pw12345678");
        cmd.Parameters.AddWithValue("@sno", "000000000000000000");
        cmd.Parameters.AddWithValue("@lvl", accountLevel);
        cmd.Parameters.AddWithValue("@admin", admin);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<int> ScalarAsync(string sql, params (string name, object value)[] parameters)
    {
        await using var connection = new SqlConnection(AdminConnectionString);
        await connection.OpenAsync();
        await using var cmd = new SqlCommand(sql, connection);
        foreach (var (name, value) in parameters) cmd.Parameters.AddWithValue(name, value);
        var result = await cmd.ExecuteScalarAsync();
        return result is DBNull or null ? 0 : Convert.ToInt32(result);
    }

    // ---- GRANT_VIP ----------------------------------------------------

    [Fact]
    public async Task GrantVip_AL1_AL2_AL3_all_apply_correctly()
    {
        if (Skip) return;
        var login = UniqueLogin("gv1");
        await SeedAccountAsync(login);
        var writer = NewWriter();

        var r1 = await writer.GrantVipAsync(login, 1, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("SUCCEEDED", r1.ResultCode);
        Assert.Equal(1, r1.NewLevel);

        var r2 = await writer.GrantVipAsync(login, 2, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal(2, r2.NewLevel);

        var r3 = await writer.GrantVipAsync(login, 3, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal(3, r3.NewLevel);
    }

    [Fact]
    public async Task GrantVip_extension_same_tier_is_idempotent_no_op()
    {
        if (Skip) return;
        var login = UniqueLogin("gvext");
        await SeedAccountAsync(login, accountLevel: 2);
        var writer = NewWriter();

        var result = await writer.GrantVipAsync(login, 2, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("SUCCEEDED", result.ResultCode);
        Assert.Equal(2, result.PreviousLevel);
        Assert.Equal(2, result.NewLevel);
    }

    [Fact]
    public async Task GrantVip_never_downgrades_a_higher_existing_tier()
    {
        if (Skip) return;
        var login = UniqueLogin("gvmax");
        await SeedAccountAsync(login, accountLevel: 3);
        var writer = NewWriter();

        var result = await writer.GrantVipAsync(login, 1, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("SUCCEEDED", result.ResultCode);
        Assert.Equal(3, result.NewLevel);
    }

    [Fact]
    public async Task GrantVip_duplicate_command_same_target_produces_identical_result()
    {
        if (Skip) return;
        var login = UniqueLogin("gvdup");
        await SeedAccountAsync(login);
        var writer = NewWriter();

        var first = await writer.GrantVipAsync(login, 2, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        var second = await writer.GrantVipAsync(login, 2, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal(first.NewLevel, second.NewLevel);
        Assert.Equal("SUCCEEDED", second.ResultCode);
    }

    [Fact]
    public async Task GrantVip_concurrent_calls_same_account_never_lose_an_update()
    {
        if (Skip) return;
        var login = UniqueLogin("gvrace");
        await SeedAccountAsync(login);
        var writerA = NewWriter();
        var writerB = NewWriter();

        var taskA = writerA.GrantVipAsync(login, 1, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        var taskB = writerB.GrantVipAsync(login, 3, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        await Task.WhenAll(taskA, taskB);

        var finalLevel = await ScalarAsync("SELECT AccountLevel FROM MEMB_INFO WHERE memb___id=@id", ("@id", login));
        Assert.Equal(3, finalLevel); // sp_getapplock serializes; MAX() makes order-independence correct regardless
    }

    [Fact]
    public async Task GrantVip_invalid_target_level_rejected()
    {
        if (Skip) return;
        var login = UniqueLogin("gvinv");
        await SeedAccountAsync(login);
        var writer = NewWriter();

        var result = await writer.GrantVipAsync(login, 0, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("INVALID_INPUT", result.ResultCode);
    }

    [Fact]
    public async Task GrantVip_nonexistent_account_reports_ACCOUNT_NOT_FOUND()
    {
        if (Skip) return;
        var writer = NewWriter();
        var result = await writer.GrantVipAsync(UniqueLogin("nope"), 1, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("ACCOUNT_NOT_FOUND", result.ResultCode);
    }

    // ---- SYNC_VIP_TIER --------------------------------------------------

    [Fact]
    public async Task SyncVipTier_AL0_through_AL3_all_apply_including_downgrade()
    {
        if (Skip) return;
        var login = UniqueLogin("sv1");
        await SeedAccountAsync(login, accountLevel: 3);
        var writer = NewWriter();

        var toZero = await writer.SyncVipTierAsync(login, 0, null, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("SUCCEEDED", toZero.ResultCode);
        Assert.Equal(0, toZero.NewLevel);
        Assert.True(toZero.Changed);

        var toTwo = await writer.SyncVipTierAsync(login, 2, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal(2, toTwo.NewLevel);
        Assert.True(toTwo.Changed);
    }

    [Fact]
    public async Task SyncVipTier_no_op_when_already_at_desired_level()
    {
        if (Skip) return;
        var login = UniqueLogin("svnoop");
        await SeedAccountAsync(login, accountLevel: 2);
        var writer = NewWriter();

        var result = await writer.SyncVipTierAsync(login, 2, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("SUCCEEDED", result.ResultCode);
        Assert.False(result.Changed);
    }

    [Fact]
    public async Task SyncVipTier_divergence_reconciliation_upgrade_and_downgrade()
    {
        if (Skip) return;
        var login = UniqueLogin("svdiv");
        // Portal thinks GameServer is at 1, but GameServer is really at 3
        // (simulated divergence) -- reconciler sends the Portal's real
        // computed truth (1), SYNC_VIP_TIER must correct it unconditionally.
        await SeedAccountAsync(login, accountLevel: 3);
        var writer = NewWriter();
        var result = await writer.SyncVipTierAsync(login, 1, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal(1, result.NewLevel);
        Assert.True(result.Changed);
    }

    [Fact]
    public async Task SyncVipTier_duplicate_command_is_safe()
    {
        if (Skip) return;
        var login = UniqueLogin("svdup");
        await SeedAccountAsync(login);
        var writer = NewWriter();
        var first = await writer.SyncVipTierAsync(login, 2, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        var second = await writer.SyncVipTierAsync(login, 2, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.True(first.Changed);
        Assert.False(second.Changed);
    }

    [Fact]
    public async Task SyncVipTier_invalid_desired_level_rejected()
    {
        if (Skip) return;
        var login = UniqueLogin("svinv");
        await SeedAccountAsync(login);
        var writer = NewWriter();
        var result = await writer.SyncVipTierAsync(login, 4, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("INVALID_INPUT", result.ResultCode);
    }

    [Fact]
    public async Task GrantVip_and_SyncVipTier_racing_the_same_account_never_corrupt_state()
    {
        if (Skip) return;
        var login = UniqueLogin("gvsvrace");
        await SeedAccountAsync(login, accountLevel: 1);
        var grantWriter = NewWriter();
        var syncWriter = NewWriter();

        // The shared GAME_ACCOUNT_MUTATION lock (plan Part 9) must serialize
        // these two different procedures against each other for the same
        // account -- proven here by asserting the final state is always one
        // of the two coherent outcomes, never a corrupted/impossible value.
        var grantTask = grantWriter.GrantVipAsync(login, 2, FutureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        var syncTask = syncWriter.SyncVipTierAsync(login, 0, null, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        await Task.WhenAll(grantTask, syncTask);

        var finalLevel = await ScalarAsync("SELECT AccountLevel FROM MEMB_INFO WHERE memb___id=@id", ("@id", login));
        Assert.True(finalLevel is 0 or 2, $"Unexpected final level {finalLevel} -- indicates the shared lock did not serialize correctly");
    }

    // ---- ANONYMIZE_GAME_ACCOUNT ------------------------------------------

    [Fact]
    public async Task AnonymizeGameAccount_full_pass_with_all_dependency_types()
    {
        if (Skip) return;
        var login = UniqueLogin("an1");
        var charName = UniqueLogin("AnChar");
        await SeedAccountAsync(login);
        await using (var connection = new SqlConnection(AdminConnectionString))
        {
            await connection.OpenAsync();
            await Exec(connection, "INSERT INTO AccountCharacter (Id, GameID1, ExtClass, ExtWarehouse) VALUES (@id, @c, 0, 0)", ("@id", login), ("@c", charName));
            await Exec(connection, "INSERT INTO Character (Name, AccountID) VALUES (@c, @id)", ("@c", charName), ("@id", login));
            await Exec(connection, "INSERT INTO CustomQuest (Name) VALUES (@c)", ("@c", charName));
            await Exec(connection, "INSERT INTO CashShopData (AccountID, WCoinC) VALUES (@id, 100)", ("@id", login));
            await Exec(connection, "INSERT INTO warehouse (AccountID, Money) VALUES (@id, 500)", ("@id", login));
            await Exec(connection, "INSERT INTO T_FriendMain (GUID, Name) VALUES (@g, @c)", ("@g", Random.Shared.Next(1, int.MaxValue)), ("@c", charName));
        }

        var writer = NewWriter();
        var result = await writer.AnonymizeGameAccountAsync(login, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("SUCCEEDED", result.ResultCode);
        Assert.NotNull(result.EntitiesAffectedJson);
        Assert.Contains("\"character\":1", result.EntitiesAffectedJson);

        var level = await ScalarAsync("SELECT AccountLevel FROM MEMB_INFO WHERE memb___id=@id", ("@id", login));
        Assert.Equal(0, level);
        var warehouseCount = await ScalarAsync("SELECT COUNT(*) FROM warehouse WHERE AccountID=@id", ("@id", login));
        Assert.Equal(0, warehouseCount);
        var questStillMatchesCharacter = await ScalarAsync(
            "SELECT COUNT(*) FROM CustomQuest cq JOIN Character c ON c.Name = cq.Name WHERE c.AccountID = @id",
            ("@id", login));
        Assert.Equal(1, questStillMatchesCharacter); // proves the NOCHECK/CHECK CHECK lockstep rename kept the FK satisfied
    }

    [Fact]
    public async Task AnonymizeGameAccount_idempotent_replay_reports_ALREADY_ANONYMIZED()
    {
        if (Skip) return;
        var login = UniqueLogin("anidem");
        await SeedAccountAsync(login);
        var writer = NewWriter();
        await writer.AnonymizeGameAccountAsync(login, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        var second = await writer.AnonymizeGameAccountAsync(login, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("ALREADY_ANONYMIZED", second.ResultCode);
    }

    [Fact]
    public async Task AnonymizeGameAccount_rejects_staff_account()
    {
        if (Skip) return;
        var login = UniqueLogin("anstaff");
        await SeedAccountAsync(login, admin: 1);
        var writer = NewWriter();
        var result = await writer.AnonymizeGameAccountAsync(login, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("STAFF_ACCOUNT_REJECTED", result.ResultCode);
    }

    [Fact]
    public async Task AnonymizeGameAccount_blocks_guild_master()
    {
        if (Skip) return;
        var login = UniqueLogin("angm");
        var charName = UniqueLogin("GM");
        await SeedAccountAsync(login);
        await using (var connection = new SqlConnection(AdminConnectionString))
        {
            await connection.OpenAsync();
            await Exec(connection, "INSERT INTO AccountCharacter (Id, GameID1, ExtClass, ExtWarehouse) VALUES (@id, @c, 0, 0)", ("@id", login), ("@c", charName));
            await Exec(connection, "INSERT INTO Character (Name, AccountID) VALUES (@c, @id)", ("@c", charName), ("@id", login));
            await Exec(connection, "INSERT INTO Guild (G_Name, G_Master) VALUES (@g, @c)", ("@g", UniqueLogin("g").Substring(0, 8)), ("@c", charName));
        }
        var writer = NewWriter();
        var result = await writer.AnonymizeGameAccountAsync(login, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("GUILD_MASTER_BLOCKED", result.ResultCode);
    }

    // ---- PURGE_GAME_ACCOUNT -----------------------------------------------

    [Fact]
    public async Task PurgeGameAccount_clean_account_removes_the_identity_row()
    {
        if (Skip) return;
        var login = UniqueLogin("pg1");
        await SeedAccountAsync(login);
        var writer = NewWriter();
        var result = await writer.PurgeGameAccountAsync(login, "integration-cycle", Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("SUCCEEDED", result.ResultCode);

        var remaining = await ScalarAsync("SELECT COUNT(*) FROM MEMB_INFO WHERE memb___id=@id", ("@id", login));
        Assert.Equal(0, remaining); // post-verification: account genuinely gone
    }

    [Fact]
    public async Task PurgeGameAccount_with_dependencies_removes_every_entity()
    {
        if (Skip) return;
        var login = UniqueLogin("pgdeps");
        var charName = UniqueLogin("PgChar");
        await SeedAccountAsync(login);
        await using (var connection = new SqlConnection(AdminConnectionString))
        {
            await connection.OpenAsync();
            await Exec(connection, "INSERT INTO AccountCharacter (Id, GameID1, ExtClass, ExtWarehouse) VALUES (@id, @c, 0, 0)", ("@id", login), ("@c", charName));
            await Exec(connection, "INSERT INTO Character (Name, AccountID) VALUES (@c, @id)", ("@c", charName), ("@id", login));
            await Exec(connection, "INSERT INTO CustomQuest (Name) VALUES (@c)", ("@c", charName));
            await Exec(connection, "INSERT INTO RankingCustom (Name) VALUES (@c)", ("@c", charName));
            await Exec(connection, "INSERT INTO CashShopData (AccountID) VALUES (@id)", ("@id", login));
            await Exec(connection, "INSERT INTO warehouse (AccountID) VALUES (@id)", ("@id", login));
        }
        var writer = NewWriter();
        var result = await writer.PurgeGameAccountAsync(login, "integration-cycle", Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("SUCCEEDED", result.ResultCode);
        Assert.NotNull(result.TablesAffectedJson);

        var remainingQuest = await ScalarAsync("SELECT COUNT(*) FROM CustomQuest WHERE Name=@c", ("@c", charName));
        Assert.Equal(0, remainingQuest); // proves the real ON DELETE CASCADE fired once Character was deleted
        var remainingRanking = await ScalarAsync("SELECT COUNT(*) FROM RankingCustom WHERE Name=@c", ("@c", charName));
        Assert.Equal(0, remainingRanking);
    }

    [Fact]
    public async Task PurgeGameAccount_idempotent_replay_reports_ALREADY_PURGED()
    {
        if (Skip) return;
        var login = UniqueLogin("pgidem");
        await SeedAccountAsync(login);
        var writer = NewWriter();
        await writer.PurgeGameAccountAsync(login, "integration-cycle", Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        var second = await writer.PurgeGameAccountAsync(login, "integration-cycle", Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("ALREADY_PURGED", second.ResultCode);
    }

    [Fact]
    public async Task PurgeGameAccount_rejects_staff_account()
    {
        if (Skip) return;
        var login = UniqueLogin("pgstaff");
        await SeedAccountAsync(login, admin: 1);
        var writer = NewWriter();
        var result = await writer.PurgeGameAccountAsync(login, "integration-cycle", Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("STAFF_ACCOUNT_REJECTED", result.ResultCode);

        var stillThere = await ScalarAsync("SELECT COUNT(*) FROM MEMB_INFO WHERE memb___id=@id", ("@id", login));
        Assert.Equal(1, stillThere); // blocked, never mutated
    }

    [Fact]
    public async Task PurgeGameAccount_empty_beta_cycle_id_rejected()
    {
        if (Skip) return;
        var login = UniqueLogin("pgempty");
        await SeedAccountAsync(login);
        var writer = NewWriter();
        var result = await writer.PurgeGameAccountAsync(login, "", Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        Assert.Equal("INVALID_INPUT", result.ResultCode);
    }

    private static async Task Exec(SqlConnection connection, string sql, params (string name, object value)[] parameters)
    {
        await using var cmd = new SqlCommand(sql, connection);
        foreach (var (name, value) in parameters) cmd.Parameters.AddWithValue(name, value);
        await cmd.ExecuteNonQueryAsync();
    }
}
