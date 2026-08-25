using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services.ContentCache;

namespace BloodMoon.Launcher.Services;

// Launcher Phase L3 -- the shared runtime services/state every page needs,
// bundled once instead of each UserControl constructing its own
// LauncherApiClient/etc (this app has no DI container; Shell owns the real
// instances and hands this down, matching the existing direct-
// instantiation convention MainWindow.xaml.cs already used).
public sealed class LauncherAppContext(
    LauncherApiClient apiClient,
    LauncherContentService bootstrapContentService,
    SlotContentService slotContentService,
    AssetCacheService assetCache,
    AssetCacheService cmsAssetCache,
    SessionStore sessionStore,
    SettingsService settingsService,
    PatchService patchService,
    LauncherUpdateService launcherUpdateService,
    BackupService backupService,
    GameConfigurationService gameConfigurationService,
    GameProcessService gameProcessService)
{
    public LauncherApiClient ApiClient { get; } = apiClient;
    public LauncherContentService BootstrapContentService { get; } = bootstrapContentService;
    public SlotContentService SlotContentService { get; } = slotContentService;
    public AssetCacheService AssetCache { get; } = assetCache;
    public AssetCacheService CmsAssetCache { get; } = cmsAssetCache;
    public SessionStore SessionStore { get; } = sessionStore;
    public SettingsService SettingsService { get; } = settingsService;
    public PatchService PatchService { get; } = patchService;
    public LauncherUpdateService LauncherUpdateService { get; } = launcherUpdateService;
    public BackupService BackupService { get; } = backupService;
    public GameConfigurationService GameConfigurationService { get; } = gameConfigurationService;
    public GameProcessService GameProcessService { get; } = gameProcessService;

    public LauncherSettings Settings { get; set; } = new();
    public LauncherSession? Session { get; set; }
    public LauncherAccount? Account { get; set; }
    public LauncherBootstrap? Bootstrap { get; set; }
    public SlotRegistryMapper Slots { get; set; } = SlotRegistryMapper.Empty;
    public List<LauncherAssetManifestEntry> SlotAssets { get; set; } = [];

    // Origin (scheme + host, no /api suffix) -- LauncherAsset.publicUrl is
    // a relative path (mirrors admin-content's existing pattern on the web
    // client); this is how a page turns it into a fetchable absolute URL.
    public string ApiOrigin => Settings.ApiBaseUrl.EndsWith("/api", StringComparison.OrdinalIgnoreCase)
        ? Settings.ApiBaseUrl[..^4]
        : Settings.ApiBaseUrl;

    public bool IsLoggedIn => Session is not null;

    // Wired by the Shell -- pages never own the login/settings overlay or
    // BrowserService.Open's try/catch/toast plumbing directly.
    public Action? RequestLogin { get; set; }
    public Action<string>? OpenExternalLink { get; set; }
    public Action<string>? ShowToast { get; set; }
    public Func<Task>? RefreshAccountAsync { get; set; }

    public event EventHandler? AccountChanged;
    public void RaiseAccountChanged() => AccountChanged?.Invoke(this, EventArgs.Empty);

    // Wired by the Shell -- it owns the progress bar UI and the single
    // in-flight-operation guard; pages (Home's JOGAR, Settings' VERIFICAR
    // ARQUIVOS/BACKUP/RESTAURAR) only ever trigger these, never duplicate
    // the patch/backup orchestration themselves.
    public bool ClientReady { get; set; }
    public Func<bool, Task>? CheckAndUpdateClientAsync { get; set; }
    public Action? StartGame { get; set; }
    public Func<Task>? RunBackupAsync { get; set; }
    public Func<Task>? RunRollbackAsync { get; set; }
    public Action<int>? ApplyResolutionProfile { get; set; }
}
