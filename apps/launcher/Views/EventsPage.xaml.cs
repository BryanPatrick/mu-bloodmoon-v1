using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using BloodMoon.Launcher.Services.Navigation;

namespace BloodMoon.Launcher.Views;

// Part AA/AB/AC -- EVENTOS. Left/active event card + right upcoming list,
// bottom full month calendar. VER DETALHES opens the website guide
// (Part AC: never a full event article inside the Launcher).
public partial class EventsPage : UserControl, ILauncherPage
{
    private LauncherAppContext _context = null!;
    private LauncherEventsResponse? _events;
    private DateOnly _calendarMonth = DateOnly.FromDateTime(DateTime.Today);

    public EventsPage() => InitializeComponent();

    public void Initialize(LauncherAppContext context) => _context = context;

    public bool OnPageLeaving(PageKey to) => true;

    public void OnPageEntering(PageKey from) => _ = RefreshAsync();

    public async Task RefreshAsync()
    {
        var bannerImage = await SlotImageResolver.ResolveAsync(_context, _context.Slots.GetAssetId("events.activeBanner"), CancellationToken.None);
        BannerBorder.Background = bannerImage is not null
            ? new ImageBrush(bannerImage) { Stretch = Stretch.UniformToFill }
            : (Brush)Application.Current.Resources["Brush.BackgroundSurfaceAlt"];

        try
        {
            _events = await _context.ApiClient.GetEventsAsync(CancellationToken.None);
        }
        catch
        {
            _events = null;
            _context.ShowToast?.Invoke(RemoteContentFailureMessages.For(RemoteContentFailureKind.ApiOffline));
        }

        ApplyActiveEvent();
        ApplyUpcoming();
        RenderCalendar();
    }

    private void ApplyActiveEvent()
    {
        var active = _events?.ActiveEvent;
        if (active is null)
        {
            ActiveNameText.Text = RemoteContentFailureMessages.For(RemoteContentFailureKind.NoEvents);
            ActiveDescriptionText.Text = "";
            ActiveCountdownText.Text = "";
            ActiveGuideButton.Visibility = Visibility.Collapsed;
            return;
        }
        ActiveNameText.Text = active.Name;
        ActiveDescriptionText.Text = active.ShortDescription;
        ActiveCountdownText.Text = active.EndsAt is { } end ? CountdownFormatter.Format(end) : "";
        ActiveGuideButton.Visibility = string.IsNullOrWhiteSpace(active.GuideUrl) ? Visibility.Collapsed : Visibility.Visible;
        ActiveGuideButton.Tag = active.GuideUrl;
    }

    private void ApplyUpcoming()
    {
        var items = (_events?.Upcoming ?? [])
            .Select(e => new UpcomingRow(e.Name, e.StartsAt is { } starts ? CountdownFormatter.Format(starts) : ""))
            .ToList();
        UpcomingItems.ItemsSource = items;
        NoUpcomingText.Visibility = items.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        NoUpcomingText.Text = RemoteContentFailureMessages.For(RemoteContentFailureKind.NoEvents);
    }

    private void RenderCalendar()
    {
        CalendarMonthText.Text = _calendarMonth.ToString("MMMM yyyy", new System.Globalization.CultureInfo("pt-BR"));
        var firstOfMonth = new DateOnly(_calendarMonth.Year, _calendarMonth.Month, 1);
        var daysInMonth = DateTime.DaysInMonth(_calendarMonth.Year, _calendarMonth.Month);
        var eventsByDay = (_events?.Calendar ?? [])
            .Where(e => e.Date.Year == _calendarMonth.Year && e.Date.Month == _calendarMonth.Month)
            .GroupBy(e => e.Date.Day)
            .ToDictionary(g => g.Key, g => g.ToList());

        var cells = new List<CalendarCell>();
        for (var day = 1; day <= daysInMonth; day++)
        {
            eventsByDay.TryGetValue(day, out var dayEvents);
            var names = dayEvents?.Select(e => e.Name).ToList() ?? [];
            var summary = names.Count switch
            {
                0 => "",
                1 => names[0],
                _ => $"{names[0]} +{names.Count - 1}"
            };
            cells.Add(new CalendarCell(day.ToString(), summary, string.Join("\n", names)));
        }
        CalendarGrid.ItemsSource = cells;
    }

    private void PreviousMonth_Click(object sender, RoutedEventArgs e)
    {
        _calendarMonth = _calendarMonth.AddMonths(-1);
        RenderCalendar();
    }

    private void NextMonth_Click(object sender, RoutedEventArgs e)
    {
        _calendarMonth = _calendarMonth.AddMonths(1);
        RenderCalendar();
    }

    private void Guide_Click(object sender, RoutedEventArgs e)
    {
        if (ActiveGuideButton.Tag is string url && !string.IsNullOrWhiteSpace(url))
        {
            _context.OpenExternalLink?.Invoke(url);
        }
    }

    private sealed record UpcomingRow(string Name, string Countdown);
    private sealed record CalendarCell(string Day, string Summary, string Tooltip);
}
