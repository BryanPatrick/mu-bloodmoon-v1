namespace BloodMoon.Launcher.Models;

// Launcher Foundation phase -- ViewModel/state contracts for the seven
// approved pages (Part M-T). These are data shapes only: no XAML, no
// layout, no final visual implementation (Part AJ). Grouped in one file
// per-page, mirroring ApiModels.cs's existing one-file-per-domain
// convention rather than one class per file.

// ---------------------------------------------------------------------
// HOME (Part N) -- the only page with JOGAR/SUPORTE/SITE/WIKI/ENTRAR-SAIR,
// character summary, event cards and latest news. Those widgets belong
// only here, never automatically reused on the internal pages.
// ---------------------------------------------------------------------

public enum PlayState
{
    NotLoggedIn,
    ReadyToPlay,
    GameAccountNotReady,
    ServerOffline
}

public sealed class ServerStatusState
{
    public string Status { get; set; } = "ONLINE";
    public string StatusSource { get; set; } = "UNKNOWN";
    public int OnlinePlayers { get; set; }
    public bool MaintenanceActive { get; set; }
    public string? MaintenanceMessage { get; set; }
}

public sealed class HomeState
{
    public LauncherCampaign Campaign { get; set; } = new();
    public CharacterSummaryState? CharacterSummary { get; set; }
    public EventCardState? ActiveEvent { get; set; }
    public UpcomingEventState? NextEvent { get; set; }
    public LauncherNews? LatestNews { get; set; }
    public PlayState PlayState { get; set; } = PlayState.NotLoggedIn;
    public ServerStatusState ServerState { get; set; } = new();
}

// ---------------------------------------------------------------------
// CONTA (Part O)
// ---------------------------------------------------------------------

public sealed class CharacterSummaryState
{
    public string CharacterId { get; set; } = "";
    public string? ClassIconAssetId { get; set; }
    public string Name { get; set; } = "";
    public string CurrentClass { get; set; } = "";
    public int Level { get; set; }
    public int Reset { get; set; }
}

public sealed class SelectedCharacterState
{
    public string Name { get; set; } = "";
    public string CurrentClass { get; set; } = "";
    public int Level { get; set; }
    public int? MasterLevel { get; set; }
    public int Reset { get; set; }
    public int? MasterReset { get; set; }
    public int? Strength { get; set; }
    public int? Agility { get; set; }
    public int? Vitality { get; set; }
    public int? Energy { get; set; }

    // Only populated for classes CharacterClassRules.SupportsCommand()
    // recognizes (e.g. Dark Lord) -- null for every other class (Part O:
    // "command somente quando aplicável").
    public int? Command { get; set; }

    public string? Location { get; set; }
    public string? PkStatus { get; set; }
    public string? Guild { get; set; }
    public bool Vip { get; set; }
}

public sealed class PersonalRankingEntry
{
    public string RankingType { get; set; } = "";
    public int Position { get; set; }
}

public sealed class GuildSummaryState
{
    public string GuildName { get; set; } = "";
    public string Role { get; set; } = "";
    public string GuildMaster { get; set; } = "";
    public int Score { get; set; }
    public int GuildRank { get; set; }
    public string? EmblemAssetId { get; set; }
}

public sealed class AccountPageState
{
    public List<CharacterSummaryState> Characters { get; set; } = [];
    public SelectedCharacterState? SelectedCharacter { get; set; }
    public List<PersonalRankingEntry> PersonalRankings { get; set; } = [];
    public GuildSummaryState? GuildSummary { get; set; }
}

// ---------------------------------------------------------------------
// NOTÍCIAS (Part P)
// ---------------------------------------------------------------------

public enum NewsFilter
{
    Todas,
    Atualizacoes,
    Eventos
}

public sealed class NewsListState
{
    public NewsFilter Filter { get; set; } = NewsFilter.Todas;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 4;
    public int TotalCount { get; set; }
    public List<LauncherNews> Items { get; set; } = [];

    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}

public sealed class NewsSummaryState
{
    public string Category { get; set; } = "";
    public string Title { get; set; } = "";
    public DateTimeOffset Date { get; set; }
    public string? HeroImageUrl { get; set; }
    public string LauncherSummary { get; set; } = "";
    // The full article always lives on the website -- the Launcher never
    // renders long-form article bodies (Part P).
    public string FullArticleUrl { get; set; } = "";
}

// ---------------------------------------------------------------------
// EVENTOS (Part Q)
// ---------------------------------------------------------------------

public sealed class EventCardState
{
    public string Name { get; set; } = "";
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset? EndsAt { get; set; }
    public string? RecommendedLevel { get; set; }
    public string? EntryInfo { get; set; }
    public string? BannerUrl { get; set; }
    public string? GuideUrl { get; set; }
}

public sealed class UpcomingEventState
{
    public DateTimeOffset StartsAt { get; set; }
    public string Name { get; set; } = "";
}

public sealed class MonthlyEventEntryState
{
    public DateOnly Date { get; set; }
    public string Name { get; set; } = "";
    public string ShortDescription { get; set; } = "";
    public DateTimeOffset StartsAt { get; set; }
    public string? GuideUrl { get; set; }
}

public sealed class EventsPageState
{
    public EventCardState? ActiveEvent { get; set; }
    public List<UpcomingEventState> UpcomingEvents { get; set; } = [];
    public List<MonthlyEventEntryState> MonthlyCalendar { get; set; } = [];
}

// ---------------------------------------------------------------------
// RANKING (Part R)
// ---------------------------------------------------------------------

public sealed class RankingRow
{
    public int Rank { get; set; }
    public string CharacterName { get; set; } = "";
    public string CurrentClass { get; set; } = "";
    public int Level { get; set; }
    public long Value { get; set; }
}

// Fixed podium layout (Part R): 1st center, 2nd left, 3rd right, 4th left
// of 2nd, 5th right of 3rd. Named slots so a future view only binds, never
// recomputes the layout.
public sealed class RankingTopFiveState
{
    public RankingRow? First { get; set; }
    public RankingRow? Second { get; set; }
    public RankingRow? Third { get; set; }
    public RankingRow? Fourth { get; set; }
    public RankingRow? Fifth { get; set; }
}

public sealed class RankingPageState
{
    public string RankingType { get; set; } = "";
    public List<string> AvailableRankingTypes { get; set; } = [];
    public RankingTopFiveState TopFive { get; set; } = new();
    public List<RankingRow> Table { get; set; } = [];
    // Pinned/fixed, shown separately from Table even if the account's own
    // character also appears within it (Part R).
    public RankingRow? OwnPosition { get; set; }
    public int Page { get; set; } = 1;
    public int TotalPages { get; set; }
}

// ---------------------------------------------------------------------
// LOJA (Part S) -- WC/GP/HP only, never real-money checkout.
// ---------------------------------------------------------------------

public enum StoreCurrency
{
    WC,
    GP,
    HP
}

public sealed class ProductCardState
{
    public string Id { get; set; } = "";
    public string ItemName { get; set; } = "";
    public string? ImageUrl { get; set; }
    public string ShortDescription { get; set; } = "";
    public StoreCurrency Currency { get; set; }
    public long Price { get; set; }
}

public sealed class StorePageState
{
    public StoreCurrency SelectedCurrency { get; set; } = StoreCurrency.WC;
    public Dictionary<StoreCurrency, long> Balances { get; set; } = new();
    public List<ProductCardState> Products { get; set; } = [];
    public int Page { get; set; } = 1;
    public int TotalPages { get; set; }
    public ProductCardState? SelectedProduct { get; set; }
}

// ---------------------------------------------------------------------
// CONFIGURAÇÕES (Part T) -- almost entirely local; wraps the existing
// LauncherSettings model rather than duplicating its fields.
// ---------------------------------------------------------------------

public enum FileVerificationState
{
    Unknown,
    Verifying,
    Verified,
    MismatchFound
}

public sealed class SettingsPageState
{
    public LauncherSettings Preferences { get; set; } = new();
    public string InstalledVersion { get; set; } = "";
    public string? LatestVersion { get; set; }
    public FileVerificationState FileVerification { get; set; } = FileVerificationState.Unknown;
}
