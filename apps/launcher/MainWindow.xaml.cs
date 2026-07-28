using System.ComponentModel;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;

namespace BloodMoon.Launcher;

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
    private LauncherSettings _settings = new();
    private LauncherSession? _session;
    private LauncherAccount? _account;
    private LauncherBootstrap? _bootstrap;
    private bool _operationInProgress;
    private bool _clientReady;

    public MainWindow()
    {
        InitializeComponent();
        _contentTimer.Tick += ContentTimer_Tick;
    }

    private async void Window_Loaded(object sender, RoutedEventArgs e)
    {
        FitWindowToScreen();
        _settings = await _settingsService.LoadAsync();
        _apiClient.Configure(_settings.ApiBaseUrl);
        PopulateSettingsForm();
        await RefreshLauncherAsync();
        await RestoreSessionAsync();
        await CheckAndUpdateClientAsync(showSuccess: false);
        _contentTimer.Start();
    }

    private void FitWindowToScreen()
    {
        const double designWidth = 1536;
        const double designHeight = 1024;
        const double margin = 0.94;
        var workArea = SystemParameters.WorkArea;
        var availableWidth = workArea.Width * margin;
        var availableHeight = workArea.Height * margin;
        var scale = Math.Min(
            1,
            Math.Min(availableWidth / designWidth, availableHeight / designHeight));

        Width = Math.Round(designWidth * scale);
        Height = Math.Round(designHeight * scale);
        Left = Math.Round(workArea.Left + (workArea.Width - Width) / 2);
        Top = Math.Round(workArea.Top + (workArea.Height - Height) / 2);
    }

    private void Window_Closing(object? sender, CancelEventArgs e)
    {
        _shutdown.Cancel();
        _contentTimer.Stop();
        _apiClient.Dispose();
        _patchService.Dispose();
        _launcherUpdateService.Dispose();
    }

    private void DragArea_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ButtonState == MouseButtonState.Pressed)
        {
            DragMove();
        }
    }

    private void MinimizeButton_Click(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Minimized;
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }

    private void SettingsButton_Click(object sender, RoutedEventArgs e)
    {
        PopulateSettingsForm();
        SettingsOverlay.Visibility = Visibility.Visible;
    }

    private void LanguageButton_Click(object sender, RoutedEventArgs e)
    {
        PopulateSettingsForm();
        LanguageCombo.Focus();
        SettingsOverlay.Visibility = Visibility.Visible;
    }

    private void CloseSettingsButton_Click(object sender, RoutedEventArgs e)
    {
        SettingsOverlay.Visibility = Visibility.Collapsed;
    }

    private async void ApplySettingsButton_Click(object sender, RoutedEventArgs e)
    {
        _settings.ResolutionIndex = Math.Max(0, ResolutionCombo.SelectedIndex);
        _settings.Language = (LanguageCombo.SelectedItem as ComboBoxItem)?.Tag?.ToString() ?? "Por";
        _settings.WindowMode = WindowModeCheck.IsChecked == true;
        _settings.MusicEnabled = MusicCheck.IsChecked == true;
        _settings.SoundEnabled = SoundCheck.IsChecked == true;

        try
        {
            _gameConfigurationService.Apply(_settings);
            await _settingsService.SaveAsync(_settings);
            SettingsOverlay.Visibility = Visibility.Collapsed;
            ShowToast("Configurações aplicadas com sucesso.");
        }
        catch (Exception exception)
        {
            ShowToast($"Não foi possível aplicar as configurações: {exception.Message}");
        }
    }

    private void PopulateSettingsForm()
    {
        ResolutionCombo.SelectedIndex = Math.Clamp(_settings.ResolutionIndex, 0, 7);
        LanguageCombo.SelectedIndex = _settings.Language switch
        {
            "Eng" => 1,
            "Spn" => 2,
            _ => 0
        };
        WindowModeCheck.IsChecked = _settings.WindowMode;
        MusicCheck.IsChecked = _settings.MusicEnabled;
        SoundCheck.IsChecked = _settings.SoundEnabled;
    }

    private void NewsButton_Click(object sender, RoutedEventArgs e)
    {
        RunBrowserAction(_bootstrap?.Links.News ?? _settings.NewsUrl);
    }

    private void SocialButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button button)
        {
            return;
        }

        var url = button.Tag?.ToString() switch
        {
            "Discord" => _bootstrap?.Links.Discord ?? _settings.DiscordUrl,
            "Whatsapp" => _bootstrap?.Links.Whatsapp ?? _settings.WhatsappUrl,
            "Instagram" => _bootstrap?.Links.Instagram ?? _settings.InstagramUrl,
            "Youtube" => _bootstrap?.Links.Youtube ?? _settings.YoutubeUrl,
            "X" => _bootstrap?.Links.X ?? _settings.XUrl,
            _ => _bootstrap?.Links.Website ?? _settings.WebsiteUrl
        };
        RunBrowserAction(url);
    }

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

    private void PlayButton_Click(object sender, RoutedEventArgs e)
    {
        if (!_clientReady)
        {
            ShowToast("O cliente ainda não foi verificado. Use VERIFICAR ARQUIVOS para tentar novamente.");
            return;
        }

        if (_operationInProgress)
        {
            ShowToast("Aguarde a operação atual terminar.");
            return;
        }

        try
        {
            _gameConfigurationService.Apply(_settings);
            _gameProcessService.Start(_settings);
            Close();
        }
        catch (Exception exception)
        {
            ShowToast(exception.Message);
        }
    }

    private async void VerifyButton_Click(object sender, RoutedEventArgs e)
    {
        await CheckAndUpdateClientAsync(showSuccess: true);
    }

    private async Task CheckAndUpdateClientAsync(bool showSuccess)
    {
        _clientReady = false;
        PlayButton.IsEnabled = false;
        await RunOperationAsync(async cancellationToken =>
        {
            SetProgress("Baixando manifesto seguro...", 0, "Conectando por HTTPS");
            var manifest = await _patchService.GetManifestAsync(
                _settings.PatchManifestUrl,
                _settings.RequireSignedManifest,
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
            var invalidFiles = await _patchService.FindInvalidFilesAsync(
                AppContext.BaseDirectory,
                manifest,
                progress,
                cancellationToken);
            var pendingDeletions = _patchService.FindPendingDeletions(
                AppContext.BaseDirectory,
                manifest);

            if (invalidFiles.Count == 0 && pendingDeletions.Count == 0)
            {
                MarkClientReady(manifest.Version);
                if (showSuccess)
                {
                    ShowToast("Cliente verificado. Todos os arquivos estão íntegros.");
                }
                return;
            }

            SetProgress(
                "Atualizando arquivos...",
                0,
                $"{invalidFiles.Count} correção(ões) · {pendingDeletions.Count} remoção(ões)");
            await _patchService.ApplyAsync(
                AppContext.BaseDirectory,
                manifest,
                invalidFiles,
                progress,
                cancellationToken);
            MarkClientReady(manifest.Version);
            ShowToast("Atualização concluída com segurança.");
        });
    }

    private void MarkClientReady(string version)
    {
        _clientReady = true;
        PlayButton.IsEnabled = true;
        SetProgress("Cliente pronto", 100, $"Versão {version}");
    }

    private async void BackupButton_Click(object sender, RoutedEventArgs e)
    {
        await RunOperationAsync(async cancellationToken =>
        {
            SetProgress("Criando backup local...", 0, "Compactando o cliente");
            var backupPath = await _backupService.CreateAsync(
                AppContext.BaseDirectory,
                cancellationToken);
            SetProgress("Backup concluído", 100, Path.GetFileName(backupPath));
            ShowToast($"Backup criado: {backupPath}");
        });
    }

    private async void RollbackButton_Click(object sender, RoutedEventArgs e)
    {
        await RunOperationAsync(async cancellationToken =>
        {
            SetProgress("Revertendo atualização...", 0, "Recuperando a versão anterior");
            try
            {
                var version = await _patchService.RollbackLatestAsync(
                    AppContext.BaseDirectory,
                    cancellationToken);
                SetProgress("Atualização revertida", 100, $"Versão removida: {version}");
                ShowToast("A atualização mais recente foi revertida.");
            }
            catch (FileNotFoundException)
            {
                var backupPath = await _backupService.RestoreLatestAsync(
                    AppContext.BaseDirectory,
                    cancellationToken);
                SetProgress("Restauração concluída", 100, Path.GetFileName(backupPath));
                ShowToast("O backup local mais recente foi restaurado.");
            }
            _clientReady = false;
            PlayButton.IsEnabled = false;
        });
    }

    private async Task RunOperationAsync(Func<CancellationToken, Task> action)
    {
        if (_operationInProgress)
        {
            ShowToast("Já existe uma operação em andamento.");
            return;
        }

        _operationInProgress = true;
        ProgressOverlay.Visibility = Visibility.Visible;
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
        if (_session is not null)
        {
            await RefreshAccountAsync(showErrors: false);
        }
    }

    private async Task RefreshLauncherAsync()
    {
        try
        {
            _bootstrap = await _apiClient.GetBootstrapAsync(_shutdown.Token);
            ApplyBootstrap(_bootstrap);
        }
        catch (Exception exception)
        {
            ServerStatusText.Text = "INDISPONÍVEL";
            ServerStatusText.Foreground = new SolidColorBrush(Color.FromRgb(206, 83, 70));
            ServerStatusDetailText.Text = "Não foi possível consultar a API.";
            if (IsLoaded)
            {
                ShowToast($"Conteúdo online indisponível: {exception.Message}");
            }
        }
    }

    private void ApplyBootstrap(LauncherBootstrap bootstrap)
    {
        _settings.PatchManifestUrl = bootstrap.Server.ManifestUrl;
        _settings.WebsiteUrl = bootstrap.Links.Website;
        _settings.NewsUrl = bootstrap.Links.News;
        _settings.DiscordUrl = bootstrap.Links.Discord;
        _settings.WhatsappUrl = bootstrap.Links.Whatsapp;
        _settings.InstagramUrl = bootstrap.Links.Instagram;
        _settings.YoutubeUrl = bootstrap.Links.Youtube;
        _settings.XUrl = bootstrap.Links.X;

        OnlinePlayersText.Text = bootstrap.Server.OnlinePlayers.ToString("N0");
        RealmText.Text = bootstrap.Server.Realm;
        ServerStatusText.Text = bootstrap.Server.Status;
        var isOnline = string.Equals(bootstrap.Server.Status, "ONLINE", StringComparison.OrdinalIgnoreCase);
        ServerStatusText.Foreground = new SolidColorBrush(
            isOnline ? Color.FromRgb(99, 200, 121) : Color.FromRgb(206, 83, 70));
        ServerStatusDetailText.Text = bootstrap.Server.Maintenance.Active
            ? bootstrap.Server.Maintenance.Message
            : "Todos os sistemas operacionais.";
        ClientVersionText.Text = $"CLIENTE {bootstrap.Server.ClientVersion}";

        var featured = bootstrap.Featured;
        FeaturedKindText.Text = featured?.Kind ?? "NOTÍCIAS";
        FeaturedTitleText.Text = featured?.Title ?? "Nenhuma notícia publicada ainda";
        FeaturedSummaryText.Text = featured?.Summary
            ?? "Quando uma notícia for publicada no site, ela aparecerá aqui automaticamente.";
        FeaturedDateText.Text = featured?.PublishedAt.ToLocalTime().ToString("dd/MM/yyyy") ?? "";
        NewsItems.ItemsSource = bootstrap.News.Skip(featured is null ? 0 : 1).Take(4).ToList();
        PatchNoteItems.ItemsSource = bootstrap.PatchNotes.Count > 0
            ? bootstrap.PatchNotes.Take(6).ToList()
            : new[] { "Nenhuma nota de atualização publicada." };
        if (!_clientReady && !_operationInProgress)
        {
            SetProgress(
                "Aguardando verificação",
                0,
                string.IsNullOrWhiteSpace(bootstrap.Server.LastPatch)
                    ? $"Versão esperada: {bootstrap.Server.ClientVersion}"
                    : $"Último patch: {bootstrap.Server.LastPatch}");
        }
    }

    private async Task RestoreSessionAsync()
    {
        _session = await _sessionStore.LoadAsync();
        if (_session is null)
        {
            ApplySignedOutState();
            return;
        }
        try
        {
            var refreshed = await _apiClient.RefreshAsync(_session.RefreshToken, _shutdown.Token);
            _session = new LauncherSession
            {
                AccessToken = refreshed.AccessToken,
                RefreshToken = refreshed.RefreshToken
            };
            await _sessionStore.SaveAsync(_session);
            await RefreshAccountAsync(showErrors: false);
        }
        catch
        {
            _sessionStore.Clear();
            _session = null;
            ApplySignedOutState();
        }
    }

    private async Task RefreshAccountAsync(bool showErrors)
    {
        if (_session is null)
        {
            ApplySignedOutState();
            return;
        }
        try
        {
            _account = await _apiClient.GetAccountAsync(_session.AccessToken, _shutdown.Token);
            ApplyAccount(_account);
        }
        catch (Exception exception)
        {
            if (showErrors)
            {
                ShowToast(exception.Message);
            }
        }
    }

    private void ApplyAccount(LauncherAccount account)
    {
        AccountActionButton.Content = "SAIR";
        AccountGreetingText.Text = $"Olá, {account.User.Name}";
        AccountEmailText.Text = account.User.Username;
        var character = account.ActiveCharacter;
        CharacterNameText.Text = character?.Name ?? "-";
        CharacterDetailText.Text = character is null
            ? "Nenhum personagem sincronizado."
            : $"{character.ClassName} · Nível {character.Level} · {character.Status}";
        CurrencyText.Text = string.Join(
            "  ·  ",
            account.Currencies.Select(currency => $"{currency.Currency}: {currency.Balance:N0}"));
    }

    private void ApplySignedOutState()
    {
        _account = null;
        AccountActionButton.Content = "ENTRAR";
        AccountGreetingText.Text = "Entre com sua conta BloodMoon";
        AccountEmailText.Text = "Seus personagens e moedas serão exibidos aqui.";
        CharacterNameText.Text = "-";
        CharacterDetailText.Text = "Faça login para visualizar.";
        CurrencyText.Text = "";
    }

    private async void AccountActionButton_Click(object sender, RoutedEventArgs e)
    {
        if (_session is null)
        {
            LoginOverlay.Visibility = Visibility.Visible;
            LoginUsernameBox.Focus();
            return;
        }
        try
        {
            await _apiClient.LogoutAsync(_session.AccessToken, _shutdown.Token);
        }
        catch
        {
            // A sessão local deve ser encerrada mesmo se a API estiver indisponível.
        }
        _sessionStore.Clear();
        _session = null;
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
            _session = new LauncherSession
            {
                AccessToken = response.AccessToken,
                RefreshToken = response.RefreshToken
            };
            await _sessionStore.SaveAsync(_session);
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

    private void UpdateProgress(PatchProgress progress)
    {
        SetProgress(
            "Atualização segura",
            progress.Percentage,
            $"{progress.CompletedFiles}/{progress.TotalFiles} · {progress.CurrentFile}");
    }

    private void SetProgress(string status, double percentage, string detail)
    {
        var value = Math.Clamp(percentage, 0, 100);
        ProgressStatusText.Text = status;
        ProgressPercentText.Text = $"{value:0}%";
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
        await Dispatcher.InvokeAsync(
            () => { },
            DispatcherPriority.ApplicationIdle);
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
}
