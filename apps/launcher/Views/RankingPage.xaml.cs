using System.Windows;
using System.Windows.Controls;
using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using BloodMoon.Launcher.Services.Navigation;

namespace BloodMoon.Launcher.Views;

// Part AD/AE -- RANKING. Fixed podium arrangement 4 2 1 3 5, own row
// pinned below the table (never inside it, even if it also appears there
// naturally) using RankingStateMapper's already-tested BuildTopFive/
// Paginate logic.
public partial class RankingPage : UserControl, ILauncherPage
{
    private const int PageSize = 10;
    private LauncherAppContext _context = null!;
    private List<RankingRow> _allRows = [];
    private int _page = 1;
    private string _rankingType = "masterReset";

    public RankingPage() => InitializeComponent();

    public void Initialize(LauncherAppContext context) => _context = context;

    public bool OnPageLeaving(PageKey to) => true;

    public void OnPageEntering(PageKey from) => _ = RefreshAsync();

    public async Task RefreshAsync()
    {
        try
        {
            var response = await _context.ApiClient.GetRankingsAsync(_rankingType, CancellationToken.None);
            _allRows = response.Entries
                .Select(e => new RankingRow { Rank = e.Rank, CharacterName = e.CharacterName, CurrentClass = e.CurrentClass, Level = e.Level, Value = e.Value })
                .ToList();
        }
        catch
        {
            _allRows = [];
            _context.ShowToast?.Invoke(RemoteContentFailureMessages.For(RemoteContentFailureKind.ApiOffline));
        }
        _page = 1;
        Render();
    }

    private void Render()
    {
        var topFive = RankingStateMapper.BuildTopFive(_allRows);
        SetPodium(P1Name, P1Value, topFive.First);
        SetPodium(P2Name, P2Value, topFive.Second);
        SetPodium(P3Name, P3Value, topFive.Third);
        SetPodium(P4Name, P4Value, topFive.Fourth);
        SetPodium(P5Name, P5Value, topFive.Fifth);

        var (items, totalPages) = RankingStateMapper.Paginate(_allRows, _page, PageSize);
        TableItems.ItemsSource = items;
        PageIndicatorText.Text = totalPages == 0 ? "-" : $"{_page} / {totalPages}";

        var ownName = _context.Account?.ActiveCharacter?.Name;
        var ownRow = string.IsNullOrWhiteSpace(ownName) ? null : _allRows.Find(r => r.CharacterName == ownName);
        if (ownRow is null)
        {
            OwnRow.Visibility = Visibility.Collapsed;
        }
        else
        {
            OwnRow.Visibility = Visibility.Visible;
            OwnRankText.Text = ownRow.Rank.ToString();
            OwnNameText.Text = ownRow.CharacterName;
            OwnClassText.Text = ownRow.CurrentClass;
            OwnValueText.Text = ownRow.Value.ToString();
        }
    }

    private static void SetPodium(TextBlock name, TextBlock value, RankingRow? row)
    {
        name.Text = row?.CharacterName ?? "-";
        value.Text = row?.Value.ToString() ?? "";
    }

    private void RankingType_Changed(object sender, RoutedEventArgs e)
    {
        // Same InitializeComponent-timing issue NewsPage.Filter_Changed
        // guards against -- TypeMasterReset's IsChecked="True" fires this
        // before Initialize(context) runs.
        if (_context is null) return;

        if (sender is RadioButton { Tag: string tag })
        {
            _rankingType = tag;
            _ = RefreshAsync();
        }
    }

    private void PreviousPage_Click(object sender, RoutedEventArgs e)
    {
        if (_page > 1) { _page--; Render(); }
    }

    private void NextPage_Click(object sender, RoutedEventArgs e)
    {
        var (_, totalPages) = RankingStateMapper.Paginate(_allRows, _page, PageSize);
        if (_page < totalPages) { _page++; Render(); }
    }
}
