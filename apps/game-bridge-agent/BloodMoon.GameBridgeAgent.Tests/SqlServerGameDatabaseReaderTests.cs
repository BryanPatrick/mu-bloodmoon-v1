using System.Reflection;
using BloodMoon.GameBridgeAgent.GameDatabase;
using Xunit;

namespace BloodMoon.GameBridgeAgent.Tests;

public class SqlServerGameDatabaseReaderTests
{
    private static readonly string[] ForbiddenKeywords =
        ["insert", "update", "delete", "execute", "write", "create", "drop", "alter", "truncate"];

    [Fact]
    public async Task GetCharacterResetSnapshotsAsync_is_blocked_by_schema_discovery()
    {
        var reader = new SqlServerGameDatabaseReader("Server=fake;Database=fake;");

        var ex = await Assert.ThrowsAsync<SchemaDiscoveryRequiredException>(
            () => reader.GetCharacterResetSnapshotsAsync(CancellationToken.None));

        Assert.NotEmpty(ex.MissingColumns);
    }

    [Fact]
    public async Task GetRankingSnapshotsAsync_is_blocked_by_schema_discovery()
    {
        var reader = new SqlServerGameDatabaseReader("Server=fake;Database=fake;");

        var ex = await Assert.ThrowsAsync<SchemaDiscoveryRequiredException>(
            () => reader.GetRankingSnapshotsAsync(CancellationToken.None));

        Assert.NotEmpty(ex.MissingColumns);
    }

    [Fact]
    public void IGameDatabaseReader_exposes_no_write_capable_member()
    {
        AssertNoWriteCapableMembers(typeof(IGameDatabaseReader));
    }

    [Fact]
    public void SqlServerGameDatabaseReader_exposes_no_write_capable_public_member()
    {
        AssertNoWriteCapableMembers(typeof(SqlServerGameDatabaseReader), declaredOnly: true);
    }

    private static void AssertNoWriteCapableMembers(Type type, bool declaredOnly = false)
    {
        var flags = BindingFlags.Public | BindingFlags.Instance | (declaredOnly ? BindingFlags.DeclaredOnly : default);
        var members = type.GetMembers(flags);
        foreach (var member in members)
        {
            var name = member.Name.ToLowerInvariant();
            foreach (var keyword in ForbiddenKeywords)
            {
                Assert.False(name.Contains(keyword), $"{type.Name}.{member.Name} looks write-capable (matches '{keyword}').");
            }
        }
    }
}
