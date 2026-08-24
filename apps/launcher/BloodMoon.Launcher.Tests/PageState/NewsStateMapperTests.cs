using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using Xunit;

namespace BloodMoon.Launcher.Tests.PageState;

public sealed class NewsStateMapperTests
{
    private static LauncherNews News(string id, string kind) => new()
    {
        Id = id,
        Slug = id,
        Kind = kind,
        Title = $"Title {id}",
        Summary = "summary",
        PublishedAt = DateTimeOffset.UtcNow,
        Url = $"https://mubloodmoon.com.br/noticias/{id}"
    };

    [Fact]
    public void Paginate_WithNoNews_ReturnsAnEmptyPageNotAnError()
    {
        var state = NewsStateMapper.Paginate([], NewsFilter.Todas);

        Assert.Empty(state.Items);
        Assert.Equal(0, state.TotalCount);
        Assert.Equal(0, state.TotalPages);
    }

    [Fact]
    public void Paginate_DefaultsToFourItemsPerPage()
    {
        var all = Enumerable.Range(1, 10).Select(i => News($"n{i}", "NEWS")).ToList();

        var page1 = NewsStateMapper.Paginate(all, NewsFilter.Todas, page: 1);

        Assert.Equal(4, page1.Items.Count);
        Assert.Equal(10, page1.TotalCount);
        Assert.Equal(3, page1.TotalPages);
    }

    [Fact]
    public void Paginate_SecondPage_ReturnsTheNextSlice()
    {
        var all = Enumerable.Range(1, 10).Select(i => News($"n{i}", "NEWS")).ToList();

        var page2 = NewsStateMapper.Paginate(all, NewsFilter.Todas, page: 2);

        Assert.Equal(["n5", "n6", "n7", "n8"], page2.Items.Select(n => n.Id));
    }

    [Fact]
    public void Paginate_FiltersByAtualizacoes_OnlyReturnsNewsKind()
    {
        List<LauncherNews> all = [News("n1", "NEWS"), News("e1", "EVENT"), News("n2", "NEWS")];

        var state = NewsStateMapper.Paginate(all, NewsFilter.Atualizacoes);

        Assert.Equal(2, state.TotalCount);
        Assert.All(state.Items, n => Assert.Equal("NEWS", n.Kind));
    }

    [Fact]
    public void Paginate_FiltersByEventos_OnlyReturnsEventKind()
    {
        List<LauncherNews> all = [News("n1", "NEWS"), News("e1", "EVENT")];

        var state = NewsStateMapper.Paginate(all, NewsFilter.Eventos);

        Assert.Equal(1, state.TotalCount);
        Assert.Equal("e1", state.Items[0].Id);
    }

    [Fact]
    public void ToSummary_CarriesTheFullArticleUrlSeparatelyFromTheLauncherSummary()
    {
        var news = News("n1", "NEWS");
        news.Summary = "short card summary";

        var summary = NewsStateMapper.ToSummary(news);

        Assert.Equal(news.Url, summary.FullArticleUrl);
        Assert.Equal("short card summary", summary.LauncherSummary);
    }
}
