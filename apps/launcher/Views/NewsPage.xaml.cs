using System.Windows;
using System.Windows.Controls;
using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using BloodMoon.Launcher.Services.Navigation;

namespace BloodMoon.Launcher.Views;

// Part Y/Z -- NOTÍCIAS. List (2x2 grid, 4/page, filters) and a second,
// in-page state for VER RESUMO -> summary view (never the full article --
// VER NOTÍCIA COMPLETA opens the website, Part Z's explicit rule).
public partial class NewsPage : UserControl, ILauncherPage
{
    private LauncherAppContext _context = null!;
    private NewsFilter _filter = NewsFilter.Todas;
    private int _page = 1;

    public NewsPage() => InitializeComponent();

    public void Initialize(LauncherAppContext context) => _context = context;

    public bool OnPageLeaving(PageKey to) => true;

    public void OnPageEntering(PageKey from)
    {
        ShowList();
        _ = RefreshAsync();
    }

    public Task RefreshAsync()
    {
        var all = _context.Bootstrap?.News ?? [];
        var state = NewsStateMapper.Paginate(all, _filter, _page);
        NewsGrid.ItemsSource = state.Items;
        PageIndicatorText.Text = state.TotalPages == 0 ? "-" : $"{state.Page} / {state.TotalPages}";
        return Task.CompletedTask;
    }

    private void Filter_Changed(object sender, RoutedEventArgs e)
    {
        // FilterTodas' IsChecked="True" (XAML) fires this Checked handler
        // during InitializeComponent itself -- before Initialize(context)
        // has ever run. Nothing to refresh yet; OnPageEntering will do the
        // first real refresh once the page is actually navigated to.
        if (_context is null) return;

        _filter = sender == FilterAtualizacoes
            ? NewsFilter.Atualizacoes
            : sender == FilterEventos
                ? NewsFilter.Eventos
                : NewsFilter.Todas;
        _page = 1;
        _ = RefreshAsync();
    }

    private void PreviousPage_Click(object sender, RoutedEventArgs e)
    {
        if (_page > 1) { _page--; _ = RefreshAsync(); }
    }

    private void NextPage_Click(object sender, RoutedEventArgs e)
    {
        _page++;
        _ = RefreshAsync();
    }

    private void OpenSummary_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button { DataContext: LauncherNews news })
        {
            return;
        }
        var summary = NewsStateMapper.ToSummary(news);
        SummaryCategoryText.Text = summary.Category;
        SummaryTitleText.Text = summary.Title;
        SummaryDateText.Text = summary.Date.ToLocalTime().ToString("dd/MM/yyyy");
        SummaryBodyText.Text = string.IsNullOrWhiteSpace(summary.LauncherSummary)
            ? RemoteContentFailureMessages.For(RemoteContentFailureKind.NoNews)
            : summary.LauncherSummary;
        FullArticleButton.Tag = summary.FullArticleUrl;
        ShowSummary();
    }

    private void Back_Click(object sender, RoutedEventArgs e) => ShowList();

    private void FullArticle_Click(object sender, RoutedEventArgs e)
    {
        if (FullArticleButton.Tag is string url && !string.IsNullOrWhiteSpace(url))
        {
            _context.OpenExternalLink?.Invoke(url);
        }
    }

    private void ShowList()
    {
        ListView.Visibility = Visibility.Visible;
        SummaryView.Visibility = Visibility.Collapsed;
    }

    private void ShowSummary()
    {
        ListView.Visibility = Visibility.Collapsed;
        SummaryView.Visibility = Visibility.Visible;
    }
}
