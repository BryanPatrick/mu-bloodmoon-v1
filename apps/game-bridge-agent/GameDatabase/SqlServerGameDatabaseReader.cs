using Microsoft.Data.SqlClient;

namespace BloodMoon.GameBridgeAgent.GameDatabase;

// Real implementation. Phase 1's bulk-poll methods
// (GetCharacterResetSnapshotsAsync/GetRankingSnapshotsAsync) remain
// BLOCKED_BY_SCHEMA_DISCOVERY -- unrelated to this phase, not touched.
// Everything else below is real, parameterized, SELECT-only SQL against
// schema confirmed live on 2026-08-20 (references/game-data/sql-discovery/).
// No method here builds SQL by string concatenation of input; every value
// crosses the wire as a SqlParameter. No method here can write: there is no
// Insert/Update/Delete/Execute*NonQuery call anywhere in this class, and
// the connection string is intended for a SELECT-only database credential.
public sealed class SqlServerGameDatabaseReader : IGameDatabaseReader
{
    private readonly string _connectionString;

    public SqlServerGameDatabaseReader(string connectionString)
    {
        _connectionString = connectionString;
    }

    public Task<IReadOnlyList<CharacterResetSnapshot>> GetCharacterResetSnapshotsAsync(CancellationToken cancellationToken) =>
        throw new SchemaDiscoveryRequiredException(
            nameof(GetCharacterResetSnapshotsAsync),
            ["Character.<primary/join key -- e.g. a character id or account link column>", "Character.<character name column>"]);

    public Task<IReadOnlyList<RankingSnapshot>> GetRankingSnapshotsAsync(CancellationToken cancellationToken) =>
        throw new SchemaDiscoveryRequiredException(
            nameof(GetRankingSnapshotsAsync),
            ["Ranking*.<character join key>", "Ranking*.<character name column>"]);

    public async Task<MembInfoAccount?> GetAccountByMembGuidAsync(int membGuid, CancellationToken cancellationToken)
    {
        using var connection = await OpenAsync(cancellationToken);
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT memb_guid, memb___id FROM MEMB_INFO WHERE memb_guid = @membGuid";
        command.Parameters.Add(new SqlParameter("@membGuid", System.Data.SqlDbType.Int) { Value = membGuid });

        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }
        return new MembInfoAccount(reader.GetInt32(0), reader.GetString(1));
    }

    public async Task<AccountCharacterSlots?> GetAccountCharacterSlotsAsync(string membId, CancellationToken cancellationToken)
    {
        using var connection = await OpenAsync(cancellationToken);
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT Id, GameID1, GameID2, GameID3, GameID4, GameID5, GameID6, GameID7, GameID8, GameID9, GameID10, GameIDC
            FROM AccountCharacter WHERE Id = @membId
            """;
        command.Parameters.Add(VarChar10("@membId", membId));

        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        var id = reader.GetString(0);
        var gameIdSlots = new List<string?>(10);
        for (var i = 1; i <= 10; i++)
        {
            gameIdSlots.Add(reader.IsDBNull(i) ? null : reader.GetString(i));
        }
        var gameIdc = reader.IsDBNull(11) ? null : reader.GetString(11);

        return AccountCharacterSlotsBuilder.Build(id, gameIdSlots, gameIdc);
    }

    public async Task<IReadOnlyList<CharacterCore>> GetCharactersByNamesAsync(IReadOnlyList<string> names, CancellationToken cancellationToken)
    {
        if (names.Count == 0)
        {
            return [];
        }

        using var connection = await OpenAsync(cancellationToken);
        using var command = connection.CreateCommand();
        var placeholderNames = InClausePlaceholders.Build(names.Count);
        for (var i = 0; i < names.Count; i++)
        {
            // The placeholder name (@name0, @name1, ...) is derived only
            // from the loop index -- never from the name value itself. The
            // real value only ever reaches the parameter's Value, never
            // CommandText, so it cannot influence the SQL text regardless
            // of its content. See InClausePlaceholdersTests /
            // SqlServerGameDatabaseReaderTests for the structural proof.
            command.Parameters.Add(VarChar10(placeholderNames[i], names[i]));
        }
        command.CommandText = $"""
            SELECT AccountID, Name, Class, cLevel, Experience, LevelUpPoint, Strength, Dexterity, Vitality, Energy,
                   Leadership, Money, MapNumber, MapPosX, MapPosY, PkCount, PkLevel, PkTime, CtlCode, ResetCount, MasterResetCount
            FROM Character WHERE Name IN ({string.Join(", ", placeholderNames)})
            """;

        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var results = new List<CharacterCore>();
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(new CharacterCore(
                Name: reader.GetString(1),
                AccountId: reader.GetString(0),
                Class: reader.GetByte(2),
                CLevel: reader.GetInt32(3),
                Experience: reader.GetInt32(4),
                LevelUpPoint: reader.GetInt32(5),
                Strength: reader.GetInt32(6),
                Dexterity: reader.GetInt32(7),
                Vitality: reader.GetInt32(8),
                Energy: reader.GetInt32(9),
                Leadership: reader.GetInt32(10),
                Money: reader.GetInt32(11),
                MapNumber: reader.GetInt16(12),
                MapPosX: reader.GetInt16(13),
                MapPosY: reader.GetInt16(14),
                PkCount: reader.GetInt32(15),
                PkLevel: reader.GetInt32(16),
                PkTime: reader.GetInt32(17),
                CtlCode: reader.GetByte(18),
                ResetCount: reader.GetInt32(19),
                MasterResetCount: reader.GetInt32(20)));
        }
        return results;
    }

    public async Task<int?> GetMasterLevelAsync(string characterName, CancellationToken cancellationToken)
    {
        using var connection = await OpenAsync(cancellationToken);
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT MasterLevel FROM MasterSkillTree WHERE Name = @name";
        command.Parameters.Add(VarChar10("@name", characterName));

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is null or DBNull ? null : Convert.ToInt32(result);
    }

    public async Task<GuildMembershipInfo?> GetGuildMembershipAsync(string characterName, CancellationToken cancellationToken)
    {
        using var connection = await OpenAsync(cancellationToken);
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT G_Name, G_Status FROM GuildMember WHERE Name = @name";
        command.Parameters.Add(VarChar10("@name", characterName));

        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }
        return new GuildMembershipInfo(reader.GetString(0), reader.GetByte(1));
    }

    public async Task<GuildInfo?> GetGuildAsync(string guildName, CancellationToken cancellationToken)
    {
        using var connection = await OpenAsync(cancellationToken);
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT G_Name, G_Master, G_Score, G_Union FROM Guild WHERE G_Name = @gname";
        command.Parameters.Add(new SqlParameter("@gname", System.Data.SqlDbType.VarChar, 8) { Value = guildName });

        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }
        return new GuildInfo(
            reader.GetString(0),
            reader.IsDBNull(1) ? null : reader.GetString(1),
            reader.IsDBNull(2) ? null : reader.GetInt32(2),
            reader.GetInt32(3));
    }

    public async Task<CharacterRankings> GetRankingsForCharacterAsync(string characterName, CancellationToken cancellationToken)
    {
        using var connection = await OpenAsync(cancellationToken);

        var bloodCastle = await ReadSingleAsync(connection, "SELECT Score FROM RankingBloodCastle WHERE Name = @name", characterName,
            r => new BloodCastleRanking(r.IsDBNull(0) ? null : r.GetInt32(0)), cancellationToken);
        var devilSquare = await ReadSingleAsync(connection, "SELECT Score FROM RankingDevilSquare WHERE Name = @name", characterName,
            r => new DevilSquareRanking(r.IsDBNull(0) ? null : r.GetInt32(0)), cancellationToken);
        var chaosCastle = await ReadSingleAsync(connection, "SELECT Score FROM RankingChaosCastle WHERE Name = @name", characterName,
            r => new ChaosCastleRanking(r.IsDBNull(0) ? null : r.GetInt32(0)), cancellationToken);
        var castleSiege = await ReadSingleAsync(connection, "SELECT KillScore, DeathScore, CrownTime FROM RankingCastleSiege WHERE Name = @name", characterName,
            r => new CastleSiegeRanking(r.IsDBNull(0) ? null : r.GetInt32(0), r.IsDBNull(1) ? null : r.GetInt32(1), r.IsDBNull(2) ? null : r.GetInt32(2)), cancellationToken);
        var duel = await ReadSingleAsync(connection, "SELECT WinScore, LoseScore FROM RankingDuel WHERE Name = @name", characterName,
            r => new DuelRanking(r.IsDBNull(0) ? null : r.GetInt32(0), r.IsDBNull(1) ? null : r.GetInt32(1)), cancellationToken);

        return new CharacterRankings(bloodCastle, devilSquare, chaosCastle, castleSiege, duel);
    }

    public async Task<CashShopBalances?> GetCashShopBalancesAsync(string membId, CancellationToken cancellationToken)
    {
        using var connection = await OpenAsync(cancellationToken);
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT WCoinC, WCoinP, GoblinPoint FROM CashShopData WHERE AccountID = @membId";
        command.Parameters.Add(VarChar10("@membId", membId));

        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }
        return new CashShopBalances(reader.GetInt32(0), reader.GetInt32(1), reader.GetInt32(2));
    }

    public async Task<int?> GetWarehouseMoneyAsync(string membId, CancellationToken cancellationToken)
    {
        using var connection = await OpenAsync(cancellationToken);
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT Money FROM warehouse WHERE AccountID = @membId";
        command.Parameters.Add(VarChar10("@membId", membId));

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is null or DBNull ? null : Convert.ToInt32(result);
    }

    public async Task<bool?> GetAccountOnlineStatusAsync(string membId, CancellationToken cancellationToken)
    {
        using var connection = await OpenAsync(cancellationToken);
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT ConnectStat FROM MEMB_STAT WHERE memb___id = @membId";
        command.Parameters.Add(VarChar10("@membId", membId));

        var result = await command.ExecuteScalarAsync(cancellationToken);
        if (result is null or DBNull)
        {
            return null;
        }
        return Convert.ToByte(result) == 1;
    }

    private async Task<SqlConnection> OpenAsync(CancellationToken cancellationToken)
    {
        var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        return connection;
    }

    private static async Task<T?> ReadSingleAsync<T>(
        SqlConnection connection, string sql, string characterName, Func<SqlDataReader, T> map, CancellationToken cancellationToken)
        where T : class
    {
        using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.Parameters.Add(VarChar10("@name", characterName));
        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }
        return map(reader);
    }

    // Character/account identity columns are real, confirmed varchar(10)
    // -- explicit VarChar sizing avoids an nvarchar-vs-varchar implicit
    // conversion against the live column's collation/index.
    private static SqlParameter VarChar10(string name, string value) =>
        new(name, System.Data.SqlDbType.VarChar, 10) { Value = value };
}
