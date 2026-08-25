using System.ComponentModel;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using BloodMoon.Launcher.Services.ContentCache;
using BloodMoon.Launcher.Services.Navigation;
using BloodMoon.Launcher.Views;

namespace BloodMoon.Launcher;

// Launcher Phase L3 -- the Shell. Owns window chrome (drag/min/close),
// the nav rail + page host, the bottom updater/status bar, the login
// overlay, and the shared LauncherAppContext every page reads from. Page-
// specific content (HOME's hero/news/events, CONTA's character list, etc)
// lives in Views/*.xaml -- this file never renders remote content itself.
public partial class MainWindow : Window
{
    private readonly SettingsService _settingsService = new();
    private readonly GameConfigurationService _gameConfigurationService = new();
    private readonly GameProcessService _gameProcessService = new();
    private readonly BackupService _backupService = new();
    private readonly PatchService _patchService = new();
    private readonly LauncherUpdateService _launcherUpdateService = new();
    private readonly LauncherApiClient _apiClient = new();
    private readonly SessionStore _sessionStore = new();
    private readonly CancellationTokenSource _shutdown = new();
    private readonly DispatcherTimer _contentTimer = new() { Interval = TimeSpan.FromMinutes(1) };
    private readonly NavigationService _navigation = new();
    private readonly Dictionary<PageKey, UserControl> _pages = new();
    private readonly Dictionary<PageKey, ToggleButton> _navButtons = new();
    private LauncherAppContext _context = null!;
    private bool _operationInProgress;

    public MainWindow()
    {
        InitializeComponent();
        _contentTimer.Tick += ContentTimer_Tick;
        _navigation.Navigated += Navigation_Navigated;
    }

    private async void Window_Loaded(object sender, RoutedEventArgs e)
    {
        var slotContentCache = new SlotContentCache();
        _context = new LauncherAppContext(
            _apiClient,
            new LauncherContentService(_apiClient, new LauncherContentCache()),
            new SlotContentService(_apiClient, slotContentCache),
            new AssetCacheService(new HttpAssetDownloader()),
            new AssetCacheService(
                new HttpAssetDownloader(),
                cacheDirectory: Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "BloodMoon", "Launcher", "cache", "cms-assets"),
                hashAlgorithm: AssetHashAlgorithm.Sha256),
            _sessionStore,
            _settingsService,
            _patchService,
            _launcherUpdateService,
            _backupService,
            _gameConfigurationService,
            _gameProcessService)
        {
            RequestLogin = () => { LoginOverlay.Visibility = Visibility.Visible; LoginUsernameBox.Focus(); },
            OpenExternalLink = RunBrowserAction,
            ShowToast = ShowToast,
            RefreshAccountAsync = () => RefreshAccountAsync(showErrors: true),
            CheckAndUpdateClientAsync = CheckAndUpdateClientAsync,
            StartGame = StartGame,
            RunBackupAsync = RunBackupAsync,
            RunRollbackAsync = RunRollbackAsync,
            ApplyResolutionProfile = ApplyResolutionProfile
        };

        _context.Settings = await _settingsService.LoadAsync();
        _apiClient.Configure(_context.Settings.ApiBaseUrl);
        ApplyResolutionProfile(_context.Settings.LauncherViewportProfileIndex);

        BuildPages();
        // NavigationService.CurrentPage already defaults to PageKey.Home
        // (Part U's own design), so TryNavigate(Home) here would hit its
        // "already on this page" early return and never call
        // OnPageEntering -- the very first page would silently never load
        // its content. The initial page host/entry is set directly instead,
        // once; every subsequent navigation goes through TryNavigate as
        // normal (real page-to-page moves always change CurrentPage).
        PageHost.Content = _pages[PageKey.Home];
        ((ILauncherPage)_pages[PageKey.Home]).OnPageEntering(PageKey.Home);

        await RefreshLauncherAsync();
        await RefreshSlotContentAsync();
        await RestoreSessionAsync();
        await CheckAndUpdateClientAsync(showSuccess: false);
        _contentTimer.Start();
    }

    // Part G/H/K -- real resolution profiles. MAXIMIZED sizes to the work
    // area (minus a small margin so the OS taskbar/edges stay respected,
    // Part K: "respeitar taskbar/work area"); every fixed profile sizes to
    // its exact number, clamped down only if the physical screen is
    // smaller (never larger than the work area, never below MinWidth/
    // MinHeight -- Part M's live-resize floor applies here too).
    private void ApplyResolutionProfile(int profileIndex)
    {
        var profile = ResolutionProfiles.ForIndex(profileIndex);
        var workArea = SystemParameters.WorkArea;

        double targetWidth;
        double targetHeight;
        if (profile.Key == ResolutionProfileKey.Maximized)
        {
            const double margin = 0.96;
            targetWidth = workArea.Width * margin;
            targetHeight = workArea.Height * margin;
        }
        else
        {
            targetWidth = Math.Min(profile.Width, workArea.Width);
            targetHeight = Math.Min(profile.Height, workArea.Height);
        }

        Width = Math.Max(MinWidth, Math.Round(targetWidth));
        Height = Math.Max(MinHeight, Math.Round(targetHeight));
        Left = Math.Round(workArea.Left + (workArea.Width - Width) / 2);
        Top = Math.Round(workArea.Top + (workArea.Height - Height) / 2);

        NavColumn.Width = new GridLength(BloodMoon.Launcher.Services.ResolutionEngine.NavColumnWidth(profile.IsWide));
        _context.Settings.LauncherViewportProfileIndex = profileIndex;
    }

    private void Window_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        // Part M: live manual resize stays safe by construction -- MinWidth/
        // MinHeight on the Window (XAML) already floors it, and the Grid-
        // based body/nav/content layout reflows naturally (no fixed-pixel
        // canvas, no clipping/overlap to guard against here).
    }

    private void BuildPages()
    {
        RegisterPage(PageKey.Home, NavHome, new HomePage());
        RegisterPage(PageKey.Account, NavAccount, new AccountPage());
        RegisterPage(PageKey.News, NavNews, new NewsPage());
        RegisterPage(PageKey.Events, NavEvents, new EventsPage());
        RegisterPage(PageKey.Ranking, NavRanking, new RankingPage());
        RegisterPage(PageKey.Store, NavStore, new StorePage());
        RegisterPage(PageKey.Settings, NavSettings, new SettingsPage());
    }

    private void RegisterPage(PageKey key, ToggleButton navButton, UserControl control)
    {
        _pages[key] = control;
        _navButtons[key] = navButton;
        if (control is ILauncherPage launcherPage)
        {
            launcherPage.Initialize(_context);
            _navigation.RegisterPage(key, launcherPage);
        }
    }

    private void Nav_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not ToggleButton button || button.Tag is not string tagName)
        {
            return;
        }
        if (!Enum.TryParse<PageKey>(tagName, out var key))
        {
            return;
        }
        if (!_navigation.TryNavigate(key))
        {
            button.IsChecked = false;
            return;
        }
    }

    private void Navigation_Navigated(object? sender, NavigationChangedEventArgs e)
    {
        foreach (var (key, navButton) in _navButtons)
        {
            navButton.IsChecked = key == e.To;
        }
        PageHost.Content = _pages[e.To];
    }

    private void Window_Closing(object? sender, CancelEventArgs e)
    {
        _shutdown.Cancel();
        _contentTimer.Stop();
        _apiClient.Dispose();
        _patchService.Dispose();
        _launcherUpdateService.Dispose();
        _ = _settingsService.SaveAsync(_context.Settings);
    }

    private void DragArea_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ButtonState == MouseButtonState.Pressed)
        {
            DragMove();
        }
    }

    private void MinimizeButton_Click(object sender, RoutedEventArgs e) => WindowState = WindowState.Minimized;

    private void CloseButton_Click(object sender, RoutedEventArgs e) => Close();

    private void RunBrowserAction(string url)
    {
        try
        {
            BrowserService.Open(url);
        }
        catch (Exception exception)
        {
            ShowToast(exception.Message);
        }
    }

    private async Task CheckAndUpdateClientAsync(bool showSuccess)
    {
        _context.ClientReady = false;
        await RunOperationAsync(async cancellationToken =>
        {
            SetProgress("Baixando manifesto seguro...", 0, "Conectando por HTTPS");
            var manifest = await _patchService.GetManifestAsync(
                _context.Settings.PatchManifestUrl,
                _context.Settings.RequireSignedManifest,
                cancellationToken);
            if (_launcherUpdateService.IsUpdateRequired(manifest.Launcher))
            {
                SetProgress("Atualizando launcher...", 0, "Preparando reinicialização segura");
                await _launcherUpdateService.StartUpdateAsync(manifest.Launcher!, cancellationToken);
                ShowToast("O launcher será reiniciado para concluir a atualização.");
                Close();
                return;
            }
            var progress = new Progress<PatchProgress>(UpdateProgress);
            var invalidFiles = await _patchService.FindInvalidFilesAsync(AppContext.BaseDirectory, manifest, progress, cancellationToken);
            var pendingDeletions = _patchService.FindPendingDeletions(AppContext.BaseDirectory, manifest);

            if (invalidFiles.Count == 0 && pendingDeletions.Count == 0)
            {
                MarkClientReady(manifest.Version);
                if (showSuccess) ShowToast("Cliente verificado. Todos os arquivos estão íntegros.");
                return;
            }

            SetProgress("Atualizando arquivos...", 0, $"{invalidFiles.Count} correção(ões) · {pendingDeletions.Count} remoção(ões)");
            await _patchService.ApplyAsync(AppContext.BaseDirectory, manifest, invalidFiles, progress, cancellationToken);
            MarkClientReady(manifest.Version);
            ShowToast("Atualização concluída com segurança.");
        });
    }

    private void MarkClientReady(string version)
    {
        _context.ClientReady = true;
        SetProgress("Cliente pronto", 100, $"Versão {version}");
    }

    private void StartGame()
    {
        if (!_context.ClientReady)
        {
            ShowToast("O cliente ainda não foi verificado. Use VERIFICAR ARQUIVOS em Configurações.");
            return;
        }
        if (_operationInProgress)
        {
            ShowToast("Aguarde a operação atual terminar.");
            return;
        }
        try
        {
            _gameConfigurationService.Apply(_context.Settings);
            _gameProcessService.Start(_context.Settings);
            if (_context.Settings.CloseLauncherAfterGameStarts)
            {
                Close();
            }
        }
        catch (Exception exception)
        {
            ShowToast(exception.Message);
        }
    }

    private async Task RunBackupAsync() =>
        await RunOperationAsync(async cancellationToken =>
        {
            SetProgress("Criando backup local...", 0, "Compactando o cliente");
            var backupPath = await _backupService.CreateAsync(AppContext.BaseDirectory, cancellationToken);
            SetProgress("Backup concluído", 100, Path.GetFileName(backupPath));
            ShowToast($"Backup criado: {backupPath}");
        });

    private async Task RunRollbackAsync() =>
        await RunOperationAsync(async cancellationToken =>
        {
            SetProgress("Revertendo atualização...", 0, "Recuperando a versão anterior");
            try
            {
                var version = await _patchService.RollbackLatestAsync(AppContext.BaseDirectory, cancellationToken);
                SetProgress("Atualização revertida", 100, $"Versão removida: {version}");
                ShowToast("A atualização mais recente foi revertida.");
            }
            catch (FileNotFoundException)
            {
                var backupPath = await _backupService.RestoreLatestAsync(AppContext.BaseDirectory, cancellationToken);
                SetProgress("Restauração concluída", 100, Path.GetFileName(backupPath));
                ShowToast("O backup local mais recente foi restaurado.");
            }
            _context.ClientReady = false;
        });

    private async Task RunOperationAsync(Func<CancellationToken, Task> action)
    {
        if (_operationInProgress)
        {
            ShowToast("Já existe uma operação em andamento.");
            return;
        }
        _operationInProgress = true;
        try
        {
            await action(_shutdown.Token);
        }
        catch (OperationCanceledException)
        {
            ShowToast("Operação cancelada.");
        }
        catch (Exception exception)
        {
            ShowToast($"A operação falhou: {exception.Message}");
        }
        finally
        {
            _operationInProgress = false;
        }
    }

    private async void ContentTimer_Tick(object? sender, EventArgs e)
    {
        await RefreshLauncherAsync();
        await RefreshSlotContentAsync();
        if (_context.Session is not null)
        {
            await RefreshAccountAsync(showErrors: false);
        }
    }

    private async Task RefreshLauncherAsync()
    {
        var result = await _context.BootstrapContentService.GetContentAsync(_shutdown.Token);
        _context.Bootstrap = result.Bootstrap;
        if (result.Source == ContentSource.PackagedFallback)
        {
            ShowToast(RemoteContentFailureMessages.For(RemoteContentFailureKind.ApiOffline));
        }
        BrandLogoImage.Source = ResolveBrandLogo();
    }

    private ImageSource? ResolveBrandLogo()
    {
        // Part E -- brandLogo is a slot-registry IMAGE (home.brandLogo);
        // resolved by the same asset-id -> LauncherAsset.publicUrl path a
        // future asset-resolution helper (Part E) will centralize once
        // more pages need it. No local fallback file ships yet -- an
        // absent/unresolved logo simply leaves the Image control empty
        // rather than showing a broken-image icon (Part F never applies a
        // literal missing-image glyph).
        return null;
    }

    private async Task RefreshSlotContentAsync()
    {
        var result = await _context.SlotContentService.GetContentAsync(null, _shutdown.Token);
        _context.Slots = new SlotRegistryMapper(result.Content.Slots);
        _context.SlotAssets = result.Content.Assets;
    }

    private async Task RestoreSessionAsync()
    {
        _context.Session = await _sessionStore.LoadAsync();
        if (_context.Session is null)
        {
            ApplySignedOutState();
            return;
        }
        try
        {
            var refreshed = await _apiClient.RefreshAsync(_context.Session.RefreshToken, _shutdown.Token);
            _context.Session = new LauncherSession { AccessToken = refreshed.AccessToken, RefreshToken = refreshed.RefreshToken };
            await _sessionStore.SaveAsync(_context.Session);
            await RefreshAccountAsync(showErrors: false);
        }
        catch
        {
            _sessionStore.Clear();
            _context.Session = null;
            ApplySignedOutState();
        }
    }

    private async Task RefreshAccountAsync(bool showErrors)
    {
        if (_context.Session is null)
        {
            ApplySignedOutState();
            return;
        }
        try
        {
            _context.Account = await _apiClient.GetAccountAsync(_context.Session.AccessToken, _shutdown.Token);
            ApplyAccount(_context.Account);
            _context.RaiseAccountChanged();
        }
        catch (Exception exception)
        {
            if (showErrors) ShowToast(exception.Message);
        }
    }

    private void ApplyAccount(LauncherAccount account)
    {
        AccountActionButton.Content = "SAIR";
        AccountGreetingText.Text = $"Olá, {account.User.Name}";
        AccountEmailText.Text = account.User.Username;
    }

    private void ApplySignedOutState()
    {
        _context.Account = null;
        AccountActionButton.Content = "ENTRAR";
        AccountGreetingText.Text = "Entre com sua conta";
        AccountEmailText.Text = "Use a mesma conta do portal.";
        _context.RaiseAccountChanged();
    }

    private async void AccountActionButton_Click(object sender, RoutedEventArgs e)
    {
        if (_context.Session is null)
        {
            _context.RequestLogin?.Invoke();
            return;
        }
        try
        {
            await _apiClient.LogoutAsync(_context.Session.AccessToken, _shutdown.Token);
        }
        catch
        {
            // A sessão local deve ser encerrada mesmo se a API estiver indisponível.
        }
        _sessionStore.Clear();
        _context.Session = null;
        ApplySignedOutState();
        ShowToast("Sessão encerrada.");
    }

    private void CloseLoginButton_Click(object sender, RoutedEventArgs e)
    {
        LoginOverlay.Visibility = Visibility.Collapsed;
        LoginPasswordBox.Clear();
        LoginTotpBox.Clear();
    }

    private async void LoginButton_Click(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrWhiteSpace(LoginUsernameBox.Text) || string.IsNullOrWhiteSpace(LoginPasswordBox.Password))
        {
            ShowToast("Informe usuário e senha.");
            return;
        }
        try
        {
            var response = await _apiClient.LoginAsync(new LoginPayload
            {
                Username = LoginUsernameBox.Text.Trim(),
                Password = LoginPasswordBox.Password,
                TotpCode = string.IsNullOrWhiteSpace(LoginTotpBox.Text) ? null : LoginTotpBox.Text.Trim()
            }, _shutdown.Token);
            _context.Session = new LauncherSession { AccessToken = response.AccessToken, RefreshToken = response.RefreshToken };
            await _sessionStore.SaveAsync(_context.Session);
            LoginOverlay.Visibility = Visibility.Collapsed;
            LoginPasswordBox.Clear();
            LoginTotpBox.Clear();
            await RefreshAccountAsync(showErrors: true);
            ShowToast("Conta conectada com sucesso.");
        }
        catch (Exception exception)
        {
            ShowToast(exception.Message);
        }
    }

    private void UpdateProgress(PatchProgress progress) =>
        SetProgress("Atualização segura", progress.Percentage, $"{progress.CompletedFiles}/{progress.TotalFiles} · {progress.CurrentFile}");

    private void SetProgress(string status, double percentage, string detail)
    {
        var value = Math.Clamp(percentage, 0, 100);
        ProgressStatusText.Text = status;
        ProgressDetailText.Text = detail;
        ProgressFillColumn.Width = new GridLength(value, GridUnitType.Star);
        ProgressRemainderColumn.Width = new GridLength(Math.Max(0.001, 100 - value), GridUnitType.Star);
    }

    private async void ShowToast(string message)
    {
        ToastText.Text = message;
        Toast.Visibility = Visibility.Visible;
        await Task.Delay(4200);
        Toast.Visibility = Visibility.Collapsed;
    }

    public async Task RenderPreviewAsync(string outputPath)
    {
        await Dispatcher.InvokeAsync(() => { }, DispatcherPriority.ApplicationIdle);
        UpdateLayout();

        var dpi = VisualTreeHelper.GetDpi(this);
        var bitmap = new RenderTargetBitmap(
            (int)Math.Ceiling(ActualWidth * dpi.DpiScaleX),
            (int)Math.Ceiling(ActualHeight * dpi.DpiScaleY),
            dpi.PixelsPerInchX,
            dpi.PixelsPerInchY,
            PixelFormats.Pbgra32);
        bitmap.Render(this);

        var encoder = new PngBitmapEncoder();
        encoder.Frames.Add(BitmapFrame.Create(bitmap));
        await using var output = File.Create(outputPath);
        encoder.Save(output);
    }

    // Test/QA hook -- navigates to a page and waits one layout pass before
    // the caller screenshots, matching RenderPreviewAsync's own idle-wait
    // pattern. Used by the --render-preview=path,PageKey CLI convention
    // App.xaml.cs parses.
    public void NavigateForPreview(PageKey page) => _navigation.TryNavigate(page);
}
