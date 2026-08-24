using System.Linq;
using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services;

// Legacy MU class names that carry a Command stat -- today just Dark Lord
// (Part O: "command somente quando aplicável"). A single, named place to
// extend if a future class ever needs the same treatment.
public static class CharacterClassRules
{
    public static bool SupportsCommand(string? className) =>
        !string.IsNullOrWhiteSpace(className) &&
        className.Contains("Dark Lord", StringComparison.OrdinalIgnoreCase);
}

// Real mapping from the existing, already-populated /launcher/bootstrap +
// /launcher/account responses. HOME is the only page with
// JOGAR/SUPORTE/SITE/WIKI/ENTRAR-SAIR, character summary, and event/news
// widgets (Part N) -- this mapper only produces the state, a future view
// decides what to render.
public static class HomeStateMapper
{
    public static HomeState Map(LauncherBootstrap bootstrap, LauncherAccount? account, bool isLoggedIn)
    {
        var activeCharacter = account?.ActiveCharacter;
        return new HomeState
        {
            Campaign = bootstrap.Campaign,
            CharacterSummary = activeCharacter is null
                ? null
                : new CharacterSummaryState
                {
                    CharacterId = activeCharacter.Id,
                    Name = activeCharacter.Name,
                    CurrentClass = activeCharacter.ClassName,
                    Level = activeCharacter.Level,
                    Reset = activeCharacter.Reset
                },
            LatestNews = bootstrap.Featured,
            PlayState = ResolvePlayState(bootstrap, isLoggedIn),
            ServerState = new ServerStatusState
            {
                Status = bootstrap.Server.Status,
                StatusSource = bootstrap.Server.StatusSource,
                OnlinePlayers = bootstrap.Server.OnlinePlayers,
                MaintenanceActive = bootstrap.Server.Maintenance.Active,
                MaintenanceMessage = bootstrap.Server.Maintenance.Active ? bootstrap.Server.Maintenance.Message : null
            }
        };
    }

    private static PlayState ResolvePlayState(LauncherBootstrap bootstrap, bool isLoggedIn)
    {
        if (!isLoggedIn) return Models.PlayState.NotLoggedIn;
        if (bootstrap.Server.Maintenance.Active) return Models.PlayState.ServerOffline;
        return Models.PlayState.ReadyToPlay;
    }
}

// Real mapping from the existing /launcher/account response's
// characters[] (Portal-local AccountCharacter -- name/className/level/
// reset/masterReset/map/guild/status). Fields with no source in any
// contract today (strength/agility/vitality/energy, masterLevel,
// pkStatus, vip, personalRankings, guildSummary detail beyond the guild
// name string) are left null/empty -- an honest, documented gap for a
// future Game Data integration to close, not a fabricated value.
public static class AccountStateMapper
{
    public static AccountPageState Map(LauncherAccount account)
    {
        var characters = account.Characters
            .Select(c => new CharacterSummaryState
            {
                CharacterId = c.Id,
                Name = c.Name,
                CurrentClass = c.ClassName,
                Level = c.Level,
                Reset = c.Reset
            })
            .ToList();

        var selected = account.ActiveCharacter is { } active
            ? new SelectedCharacterState
            {
                Name = active.Name,
                CurrentClass = active.ClassName,
                Level = active.Level,
                Reset = active.Reset,
                MasterReset = active.MasterReset,
                Command = CharacterClassRules.SupportsCommand(active.ClassName) ? 0 : null,
                Guild = string.IsNullOrWhiteSpace(active.Guild) ? null : active.Guild
            }
            : null;

        return new AccountPageState
        {
            Characters = characters,
            SelectedCharacter = selected,
            PersonalRankings = [],
            GuildSummary = null
        };
    }
}

// Real mapping from the existing /launcher/bootstrap news[] list (Part P).
public static class NewsStateMapper
{
    public static NewsListState Paginate(
        IReadOnlyList<LauncherNews> allNews, NewsFilter filter, int page = 1, int pageSize = 4)
    {
        var filtered = allNews.Where(n => Matches(n, filter)).ToList();
        var totalCount = filtered.Count;
        var safePage = Math.Max(1, page);
        var items = filtered.Skip((safePage - 1) * pageSize).Take(pageSize).ToList();

        return new NewsListState
        {
            Filter = filter,
            Page = safePage,
            PageSize = pageSize,
            TotalCount = totalCount,
            Items = items
        };
    }

    public static NewsSummaryState ToSummary(LauncherNews news) => new()
    {
        Category = news.Kind,
        Title = news.Title,
        Date = news.PublishedAt,
        HeroImageUrl = news.ImageUrl,
        LauncherSummary = news.Summary ?? "",
        FullArticleUrl = news.Url
    };

    private static bool Matches(LauncherNews news, NewsFilter filter) => filter switch
    {
        NewsFilter.Todas => true,
        NewsFilter.Atualizacoes => string.Equals(news.Kind, "NEWS", StringComparison.OrdinalIgnoreCase),
        NewsFilter.Eventos => string.Equals(news.Kind, "EVENT", StringComparison.OrdinalIgnoreCase),
        _ => true
    };
}

// Parts Q/R/S -- no backend contract exposes event schedules, ranking rows,
// or store products yet (confirmed during this phase's audit: no such
// route exists, and inventing one would mean fabricating game/economy data
// that was never evidenced -- exactly what this project's SOURCE/RAW/
// NORMALIZED/DERIVED discipline forbids). These mappers are therefore pure
// shaping/layout functions over already-typed rows a future data source
// will supply, not end-to-end mappers from a real DTO. That real wiring is
// explicitly deferred, matching Part AJ.
public static class EventsStateMapper
{
    public static EventsPageState Build(
        EventCardState? activeEvent,
        IEnumerable<UpcomingEventState> upcoming,
        IEnumerable<MonthlyEventEntryState> monthly) => new()
    {
        ActiveEvent = activeEvent,
        UpcomingEvents = upcoming.OrderBy(e => e.StartsAt).ToList(),
        MonthlyCalendar = monthly.OrderBy(e => e.Date).ToList()
    };
}

public static class RankingStateMapper
{
    // Expects rows already ordered by Rank ascending. Part R's fixed
    // podium layout: 1st center, 2nd left, 3rd right, 4th left of 2nd,
    // 5th right of 3rd -- the slot assignment itself (which rank goes in
    // which named slot) is the only thing this needs to get right; visual
    // placement is a future view's concern.
    public static RankingTopFiveState BuildTopFive(IReadOnlyList<RankingRow> orderedRows) => new()
    {
        First = orderedRows.ElementAtOrDefault(0),
        Second = orderedRows.ElementAtOrDefault(1),
        Third = orderedRows.ElementAtOrDefault(2),
        Fourth = orderedRows.ElementAtOrDefault(3),
        Fifth = orderedRows.ElementAtOrDefault(4)
    };

    public static (List<RankingRow> Items, int TotalPages) Paginate(
        IReadOnlyList<RankingRow> orderedRows, int page, int pageSize)
    {
        var totalPages = pageSize <= 0 ? 0 : (int)Math.Ceiling(orderedRows.Count / (double)pageSize);
        var safePage = Math.Max(1, page);
        var items = orderedRows.Skip((safePage - 1) * pageSize).Take(pageSize).ToList();
        return (items, totalPages);
    }
}

public static class StoreStateMapper
{
    public static List<ProductCardState> FilterByCurrency(
        IEnumerable<ProductCardState> products, StoreCurrency currency) =>
        products.Where(p => p.Currency == currency).ToList();
}

// Part G -- the backend already caps GET /launcher/bootstrap's socials at
// MAX_SOCIAL_ITEMS (apps/api/src/modules/launcher/launcher.service.ts), but
// a stale cached payload written by an older backend build is never
// trusted to already respect a limit this build enforces today. Defense
// in depth: the fixed-size social rail can never grow past what the
// approved layout has room for, regardless of payload source.
public static class SocialLinkPolicy
{
    public const int MaxSocialItems = 5;

    public static IReadOnlyList<LauncherSocialLink> Cap(IReadOnlyList<LauncherSocialLink> socials) =>
        socials.Count <= MaxSocialItems ? socials : socials.Take(MaxSocialItems).ToList();
}
