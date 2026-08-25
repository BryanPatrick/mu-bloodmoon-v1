using System.Windows;
using System.Windows.Controls;
using BloodMoon.Launcher.Services;
using BloodMoon.Launcher.Services.Navigation;

namespace BloodMoon.Launcher.Views;

// Part AN/AO/L -- CONFIGURAÇÕES, one of the 7 navigable pages (not a
// modal, unlike the pre-existing MainWindow's old SettingsOverlay this
// replaces). Tabs: JOGO/LAUNCHER/ATUALIZAÇÃO/ÁUDIO/DESEMPENHO. Real local
// preferences persisted via the existing SettingsService -- the account
// login/logout chip is reused here (same account state the nav rail
// shows), matching Part T's "wraps the existing LauncherSettings model
// rather than duplicating its fields."
public partial class SettingsPage : UserControl, ILauncherPage
{
    private LauncherAppContext _context = null!;
    // TabJogo's IsChecked="True" (XAML) fires Tab_Changed synchronously
    // during InitializeComponent, before later-declared named elements
    // (PanelLauncher/PanelAtualizacao/PanelAudio/PanelDesempenho) exist
    // yet -- every XAML-driven handler below checks this before touching
    // any named element.
    private bool _initialized;

    public SettingsPage()
    {
        InitializeComponent();
        ViewportCombo.ItemsSource = ResolutionProfiles.All;
        ViewportCombo.DisplayMemberPath = nameof(ResolutionProfile.Label);
        _initialized = true;
    }

    public void Initialize(LauncherAppContext context)
    {
        _context = context;
        _context.AccountChanged += (_, _) => ApplyAccountChip();
    }

    public bool OnPageLeaving(PageKey to) => true;

    public void OnPageEntering(PageKey from) => _ = RefreshAsync();

    public Task RefreshAsync()
    {
        var settings = _context.Settings;
        GameResolutionCombo.SelectedIndex = Math.Clamp(settings.ResolutionIndex, 0, 7);
        LanguageCombo.SelectedIndex = settings.Language switch { "Eng" => 1, "Spn" => 2, _ => 0 };
        WindowModeCheck.IsChecked = settings.WindowMode;

        ViewportCombo.SelectedIndex = Math.Clamp(settings.LauncherViewportProfileIndex, 0, ResolutionProfiles.All.Count - 1);
        StartWithWindowsCheck.IsChecked = settings.StartWithWindows;
        MinimizeToTrayCheck.IsChecked = settings.MinimizeToTray;
        CloseAfterGameStartsCheck.IsChecked = settings.CloseLauncherAfterGameStarts;
        UiAnimationsCheck.IsChecked = settings.UiAnimationsEnabled;

        InstalledVersionText.Text = $"Versão instalada: {settings.PatchManifestUrl}";

        MusicCheck.IsChecked = settings.MusicEnabled;
        SoundCheck.IsChecked = settings.SoundEnabled;
        VolumeSlider.Value = settings.Volume;

        QualityCombo.SelectedIndex = settings.Quality switch { "Baixa" => 0, "Média" => 1, _ => 2 };
        PerformanceModeCheck.IsChecked = settings.PerformanceMode;

        ApplyAccountChip();
        return Task.CompletedTask;
    }

    private void ApplyAccountChip()
    {
        if (_context.IsLoggedIn && _context.Account is not null)
        {
            AccountActionButton.Content = "SAIR";
            AccountGreetingText.Text = $"Olá, {_context.Account.User.Name}";
            AccountEmailText.Text = _context.Account.User.Username;
        }
        else
        {
            AccountActionButton.Content = "ENTRAR";
            AccountGreetingText.Text = "Entre com sua conta BloodMoon";
            AccountEmailText.Text = "Use a mesma conta do portal.";
        }
    }

    private void Tab_Changed(object sender, RoutedEventArgs e)
    {
        if (!_initialized) return;
        PanelJogo.Visibility = sender == TabJogo ? Visibility.Visible : Visibility.Collapsed;
        PanelLauncher.Visibility = sender == TabLauncher ? Visibility.Visible : Visibility.Collapsed;
        PanelAtualizacao.Visibility = sender == TabAtualizacao ? Visibility.Visible : Visibility.Collapsed;
        PanelAudio.Visibility = sender == TabAudio ? Visibility.Visible : Visibility.Collapsed;
        PanelDesempenho.Visibility = sender == TabDesempenho ? Visibility.Visible : Visibility.Collapsed;
    }

    private void ViewportCombo_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        // Live preview -- Part L: selecting a profile applies immediately,
        // APLICAR only persists it (matches how the resolution combo felt
        // in the pre-existing overlay: instant feedback, explicit save).
        if (_initialized && _context is not null && ViewportCombo.SelectedIndex >= 0)
        {
            _context.ApplyResolutionProfile?.Invoke(ViewportCombo.SelectedIndex);
        }
    }

    private async void Apply_Click(object sender, RoutedEventArgs e)
    {
        var settings = _context.Settings;
        settings.ResolutionIndex = Math.Max(0, GameResolutionCombo.SelectedIndex);
        settings.Language = (LanguageCombo.SelectedItem as ComboBoxItem)?.Tag?.ToString() ?? "Por";
        settings.WindowMode = WindowModeCheck.IsChecked == true;

        settings.LauncherViewportProfileIndex = ViewportCombo.SelectedIndex;
        settings.StartWithWindows = StartWithWindowsCheck.IsChecked == true;
        settings.MinimizeToTray = MinimizeToTrayCheck.IsChecked == true;
        settings.CloseLauncherAfterGameStarts = CloseAfterGameStartsCheck.IsChecked == true;
        settings.UiAnimationsEnabled = UiAnimationsCheck.IsChecked == true;

        settings.MusicEnabled = MusicCheck.IsChecked == true;
        settings.SoundEnabled = SoundCheck.IsChecked == true;
        settings.Volume = (int)VolumeSlider.Value;

        settings.Quality = (QualityCombo.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "Alta";
        settings.PerformanceMode = PerformanceModeCheck.IsChecked == true;

        try
        {
            _context.GameConfigurationService.Apply(settings);
            await _context.SettingsService.SaveAsync(settings);
            _context.ApplyResolutionProfile?.Invoke(settings.LauncherViewportProfileIndex);
            _context.ShowToast?.Invoke("Configurações aplicadas com sucesso.");
        }
        catch (Exception exception)
        {
            _context.ShowToast?.Invoke($"Não foi possível aplicar as configurações: {exception.Message}");
        }
    }

    private async void Verify_Click(object sender, RoutedEventArgs e)
    {
        if (_context.CheckAndUpdateClientAsync is not null)
        {
            await _context.CheckAndUpdateClientAsync(true);
        }
    }

    private async void Backup_Click(object sender, RoutedEventArgs e)
    {
        if (_context.RunBackupAsync is not null)
        {
            await _context.RunBackupAsync();
        }
    }

    private async void Rollback_Click(object sender, RoutedEventArgs e)
    {
        if (_context.RunRollbackAsync is not null)
        {
            await _context.RunRollbackAsync();
        }
    }

    private void AccountAction_Click(object sender, RoutedEventArgs e)
    {
        if (!_context.IsLoggedIn)
        {
            _context.RequestLogin?.Invoke();
        }
        // Logout stays on the nav rail's account chip (Shell owns the real
        // logout call + session clearing) -- this button only opens login
        // when signed out, matching the nav chip's own click semantics.
    }
}
