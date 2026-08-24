using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using Xunit;

namespace BloodMoon.Launcher.Tests.PageState;

public sealed class RankingStateMapperTests
{
    private static RankingRow Row(int rank) => new() { Rank = rank, CharacterName = $"Char{rank}", Level = 400, Value = 1000 - rank };

    [Fact]
    public void BuildTopFive_WithFiveOrMoreRows_AssignsEachNamedSlotByRank()
    {
        var rows = Enumerable.Range(1, 10).Select(Row).ToList();

        var topFive = RankingStateMapper.BuildTopFive(rows);

        Assert.Equal(1, topFive.First!.Rank);
        Assert.Equal(2, topFive.Second!.Rank);
        Assert.Equal(3, topFive.Third!.Rank);
        Assert.Equal(4, topFive.Fourth!.Rank);
        Assert.Equal(5, topFive.Fifth!.Rank);
    }

    [Fact]
    public void BuildTopFive_WithFewerThanFiveRows_LeavesMissingSlotsNull()
    {
        List<RankingRow> rows = [Row(1), Row(2)];

        var topFive = RankingStateMapper.BuildTopFive(rows);

        Assert.NotNull(topFive.First);
        Assert.NotNull(topFive.Second);
        Assert.Null(topFive.Third);
        Assert.Null(topFive.Fourth);
        Assert.Null(topFive.Fifth);
    }

    [Fact]
    public void BuildTopFive_WithNoRows_IsAllNullNotAnError()
    {
        var topFive = RankingStateMapper.BuildTopFive([]);

        Assert.Null(topFive.First);
        Assert.Null(topFive.Fifth);
    }

    [Fact]
    public void Paginate_SlicesAndComputesTotalPages()
    {
        var rows = Enumerable.Range(1, 25).Select(Row).ToList();

        var (items, totalPages) = RankingStateMapper.Paginate(rows, page: 2, pageSize: 10);

        Assert.Equal(10, items.Count);
        Assert.Equal(11, items[0].Rank);
        Assert.Equal(3, totalPages);
    }
}
