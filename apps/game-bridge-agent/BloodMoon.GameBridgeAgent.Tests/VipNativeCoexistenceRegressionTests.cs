using System.Data;
using BloodMoon.GameBridgeAgent.GameDatabase;
using Microsoft.Data.SqlClient;
using Xunit;

namespace BloodMoon.GameBridgeAgent.Tests;

// PHASE L DECISION CLOSURE, 2026-08-31 -- Bryan required a PERMANENT
// regression test proving the critical VIP-expiry bug
// (docs/vip/wz-setaccountlevel-coexistence.md) stays fixed: GRANT_VIP must
// survive the native engine's own login-time check
// (dbo.WZ_GetAccountLevel), and an actually-expired grant must still be
// correctly reverted to AL0 by that same check. This is a standing suite
// member, not an ad-hoc script -- the earlier verification
// (references/game-data/sql-discovery/phase-l-20260831/verify-fix.sql) was
// a one-time manual repro, not a repeatable automated test.
//
// Runs only against bloodmoon_gameserver_lab (the real-schema, real-data
// local lab, docs/gameserver/database/lab-environment.md) because
// dbo.WZ_GetAccountLevel/WZ_SetAccountLevel are NATIVE procedures that only
// exist there -- bloodmoon_gamebridge_test (SqlServerLocalIntegrationTests'
// synthetic 25-table environment) has no native procedures at all.
// Separate env vars from SqlServerLocalIntegrationTests on purpose, so
// either environment can be configured independently.
//
// GAMEBRIDGE_LAB_SQL_TEST_CONNECTION: the real bloodmoon_writer_local
// connection (EXECUTE-only on the four bm_* procedures, DENY on the whole
// schema) -- this is what SqlServerGameDatabaseWriter (the code under test)
// connects with, exactly like production's bloodmoon_writer.
// GAMEBRIDGE_LAB_SQL_ADMIN_CONNECTION: unrestricted (Windows-auth sysadmin)
// connection used for fixture seeding/verification AND for simulating the
// native game engine's own call to dbo.WZ_GetAccountLevel -- the
// GameBridge Agent itself never calls that procedure (only the native
// engine does, on every login), and bloodmoon_writer_local correctly has
// no EXECUTE grant on it, so simulating "the engine checks this account on
// login" requires the admin connection, matching the real division of
// responsibility between the Agent and the native GameServer.
public sealed class VipNativeCoexistenceRegressionTests
{
    private static readonly string? ConnectionString = Environment.GetEnvironmentVariable("GAMEBRIDGE_LAB_SQL_TEST_CONNECTION");
    private static readonly string? AdminConnectionString = Environment.GetEnvironmentVariable("GAMEBRIDGE_LAB_SQL_ADMIN_CONNECTION");

    private static bool Skip => ConnectionString is null || AdminConnectionString is null;

    private static SqlServerGameDatabaseWriter NewWriter() => new(ConnectionString!);

    private static string UniqueLogin(string prefix) => (prefix + Guid.NewGuid().ToString("N")).Substring(0, 10);

    private static async Task SeedAccountAsync(string legacyLogin)
    {
        await using var connection = new SqlConnection(AdminConnectionString);
        await connection.OpenAsync();
        // Real MEMB_INFO NOT-NULL-without-default columns confirmed via
        // INFORMATION_SCHEMA.COLUMNS against bloodmoon_gameserver_lab,
        // 2026-08-31: memb_guid (IDENTITY, no explicit value needed),
        // memb___id, memb__pwd, memb_name, sno__numb, bloc_code, ctl1_code
        // (both char(1)). AccountLevel/AccountExpireDate start at their
        // real native defaults (0 / 1900-01-01) -- exactly the "never
        // touched by GameBridge yet" starting state the original bug
        // reproduction used.
        await using var cmd = new SqlCommand(
            "INSERT INTO MEMB_INFO (memb___id, memb__pwd, memb_name, sno__numb, bloc_code, ctl1_code, AccountLevel, Admin) VALUES (@id, @pw, @id, @sno, '0', '0', 0, 0)",
            connection);
        cmd.Parameters.AddWithValue("@id", legacyLogin);
        cmd.Parameters.AddWithValue("@pw", "pw12345678");
        cmd.Parameters.AddWithValue("@sno", "000000000000000000");
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task DeleteAccountAsync(string legacyLogin)
    {
        await using var connection = new SqlConnection(AdminConnectionString);
        await connection.OpenAsync();
        await using var cmd = new SqlCommand("DELETE FROM MEMB_INFO WHERE memb___id = @id", connection);
        cmd.Parameters.AddWithValue("@id", legacyLogin);
        await cmd.ExecuteNonQueryAsync();
    }

    // Simulates the native GameServer's own per-login check -- the exact
    // real procedure body, confirmed via sys.sql_modules and reproduced
    // verbatim in docs/vip/wz-setaccountlevel-coexistence.md. Called via
    // the ADMIN connection, never the Agent's own writer connection: the
    // Agent has no business calling this procedure, only the native engine
    // does, and bloodmoon_writer_local correctly has no EXECUTE grant on
    // it (least privilege, unchanged by this test).
    private static async Task SimulateNativeLoginCheckAsync(string legacyLogin)
    {
        await using var connection = new SqlConnection(AdminConnectionString);
        await connection.OpenAsync();
        await using var cmd = new SqlCommand("dbo.WZ_GetAccountLevel", connection) { CommandType = CommandType.StoredProcedure };
        cmd.Parameters.Add(new SqlParameter("@Account", SqlDbType.VarChar, 10) { Value = legacyLogin });
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<(int AccountLevel, DateTime AccountExpireDate)> ReadAccountStateAsync(string legacyLogin)
    {
        await using var connection = new SqlConnection(AdminConnectionString);
        await connection.OpenAsync();
        await using var cmd = new SqlCommand("SELECT AccountLevel, AccountExpireDate FROM MEMB_INFO WHERE memb___id = @id", connection);
        cmd.Parameters.AddWithValue("@id", legacyLogin);
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();
        return (reader.GetInt32(0), reader.GetDateTime(1));
    }

    [Fact]
    public async Task GrantVip_survives_the_native_login_check_while_the_entitlement_is_still_valid()
    {
        if (Skip) return;
        var login = UniqueLogin("vipsurv");
        await SeedAccountAsync(login);
        try
        {
            var writer = NewWriter();
            var futureExpiry = DateTime.UtcNow.AddDays(30);
            // Truncate to whole seconds -- SMALLDATETIME (AccountExpireDate's
            // real column type) only has 1-minute precision; comparing exact
            // sub-second DateTime values after a round trip through it would
            // spuriously fail.
            futureExpiry = new DateTime(futureExpiry.Year, futureExpiry.Month, futureExpiry.Day, futureExpiry.Hour, futureExpiry.Minute, 0, DateTimeKind.Utc);

            var grantResult = await writer.GrantVipAsync(login, 3, futureExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
            Assert.Equal("SUCCEEDED", grantResult.ResultCode);

            var afterGrant = await ReadAccountStateAsync(login);
            Assert.Equal(3, afterGrant.AccountLevel);
            Assert.Equal(futureExpiry, afterGrant.AccountExpireDate);

            // The bug this test permanently guards against: the native
            // engine's own per-login check used to silently revert this to
            // AL0 because AccountExpireDate was never written by the old
            // bm_GrantVip. Simulate that exact check now.
            await SimulateNativeLoginCheckAsync(login);

            var afterLoginCheck = await ReadAccountStateAsync(login);
            Assert.Equal(3, afterLoginCheck.AccountLevel);
            Assert.Equal(futureExpiry, afterLoginCheck.AccountExpireDate);

            // A second login check (e.g. a later session) must be equally
            // safe -- not a one-time fluke of the first call.
            await SimulateNativeLoginCheckAsync(login);
            var afterSecondLoginCheck = await ReadAccountStateAsync(login);
            Assert.Equal(3, afterSecondLoginCheck.AccountLevel);
        }
        finally
        {
            await DeleteAccountAsync(login);
        }
    }

    [Fact]
    public async Task Expired_vip_is_correctly_reverted_to_AL0_by_the_native_login_check()
    {
        if (Skip) return;
        var login = UniqueLogin("vipexp");
        await SeedAccountAsync(login);
        try
        {
            var writer = NewWriter();
            // Grant with an expiry already in the past. bm_GrantVip's own
            // validation only rejects a NULL/out-of-range expiry, not a
            // past one -- a past expiry is a legitimate state to reach in
            // production (e.g. a reconciler tick that runs slightly late),
            // and this test exists specifically to prove the native check
            // still correctly enforces it either way.
            var pastExpiry = DateTime.UtcNow.AddDays(-1);
            pastExpiry = new DateTime(pastExpiry.Year, pastExpiry.Month, pastExpiry.Day, pastExpiry.Hour, pastExpiry.Minute, 0, DateTimeKind.Utc);

            var grantResult = await writer.GrantVipAsync(login, 2, pastExpiry, Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
            Assert.Equal("SUCCEEDED", grantResult.ResultCode);

            var afterGrant = await ReadAccountStateAsync(login);
            Assert.Equal(2, afterGrant.AccountLevel);

            // Simulate the player's next login -- WZ_GetAccountLevel must
            // detect GETDATE() > AccountExpireDate and revert to AL0.
            await SimulateNativeLoginCheckAsync(login);

            var afterLoginCheck = await ReadAccountStateAsync(login);
            Assert.Equal(0, afterLoginCheck.AccountLevel);
        }
        finally
        {
            await DeleteAccountAsync(login);
        }
    }
}
