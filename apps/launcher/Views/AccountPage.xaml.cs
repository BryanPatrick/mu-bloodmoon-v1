using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using BloodMoon.Launcher.Services.Navigation;

namespace BloodMoon.Launcher.Views;

// Part O/P/Q/R -- CONTA. Left: character list. Center: selected character
// (stats + attributes, no XP bar, no currencies, no account-security
// widgets, no JOGAR -- Part V's explicit exclusion list). Right: personal
// ranking + guild summary.
public partial class AccountPage : UserControl, ILauncherPage
{
    private LauncherAppContext _context = null!;

    public AccountPage() => InitializeComponent();

    public void Initialize(LauncherAppContext context)
    {
        _context = context;
        _context.AccountChanged += (_, _) => _ = RefreshAsync();
    }

    public bool OnPageLeaving(PageKey to) => true;

    public void OnPageEntering(PageKey from) => _ = RefreshAsync();

    public Task RefreshAsync()
    {
        if (!_context.IsLoggedIn)
        {
            SignedOutPanel.Visibility = Visibility.Visible;
            ContentPanel.Visibility = Visibility.Collapsed;
            AccountStatusPanel.Visibility = Visibility.Collapsed;
            return Task.CompletedTask;
        }
        SignedOutPanel.Visibility = Visibility.Collapsed;
        ContentPanel.Visibility = Visibility.Visible;
        AccountStatusPanel.Visibility = Visibility.Visible;

        var account = _context.Account;
        var unified = _context.UnifiedAccount;
        AccountIdentityText.Text = account is null
            ? "CONTA BLOOD MOON"
            : $"{account.User.Name} · @{account.User.Username}";
        AccountRoleText.Text = unified is null
            ? "Status da conta temporariamente indisponível"
            : $"PERFIL {unified.Role} · CONTA ATIVA";
        ProvisioningStateText.Text = unified is null
            ? "JOGO — INDISPONÍVEL"
            : unified.GameReady
                ? "CONTA DE JOGO — PRONTA"
                : $"CONTA DE JOGO — {unified.ProvisioningStatus}";
        ProvisioningStateText.Foreground = (Brush)Application.Current.Resources[
            unified?.GameReady == true ? "Brush.Success" : "Brush.Warning"];
        // Phase 2D Part 12 -- real 2FA status (SessionUser.TwoFactorEnabled,
        // captured at login, previously received but never read anywhere
        // in the Launcher). Replaces the prior static "SESSÃO PROTEGIDA"
        // label with the real, current state.
        AccountSecurityText.Text = _context.TwoFactorEnabled
            ? "AUTENTICAÇÃO EM DUAS ETAPAS — ATIVA"
            : "AUTENTICAÇÃO EM DUAS ETAPAS — NÃO ATIVADA";
        var state = account is null
            ? new AccountPageState()
            : AccountStateMapper.Map(account);

        CharacterItems.ItemsSource = state.Characters;
        NoCharactersText.Visibility = state.Characters.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        NoCharactersText.Text = RemoteContentFailureMessages.For(RemoteContentFailureKind.NoCharacters);

        ApplySelectedCharacter(state.SelectedCharacter);
        ApplyPersonalRanking(state.PersonalRankings);
        ApplyGuild(state.GuildSummary);
        _ = ApplyClassIconsAsync();
        return Task.CompletedTask;
    }

    private void ApplySelectedCharacter(SelectedCharacterState? selected)
    {
        if (selected is null)
        {
            SelectedNameText.Text = "-";
            SelectedClassText.Text = RemoteContentFailureMessages.For(RemoteContentFailureKind.NoCharacters);
            LevelText.Text = MasterLevelText.Text = ResetText.Text = MasterResetText.Text = "-";
            StrengthText.Text = AgilityText.Text = VitalityText.Text = EnergyText.Text = "-";
            LocationText.Text = PkText.Text = GuildText.Text = VipText.Text = "-";
            CommandPanel.Visibility = Visibility.Collapsed;
            return;
        }

        SelectedNameText.Text = selected.Name;
        SelectedClassText.Text = selected.CurrentClass;
        LevelText.Text = selected.Level.ToString();
        MasterLevelText.Text = selected.MasterLevel?.ToString() ?? "-";
        ResetText.Text = selected.Reset.ToString();
        MasterResetText.Text = selected.MasterReset?.ToString() ?? "-";
        StrengthText.Text = selected.Strength?.ToString() ?? "-";
        AgilityText.Text = selected.Agility?.ToString() ?? "-";
        VitalityText.Text = selected.Vitality?.ToString() ?? "-";
        EnergyText.Text = selected.Energy?.ToString() ?? "-";
        LocationText.Text = selected.Location ?? "-";
        PkText.Text = selected.PkStatus ?? "-";
        GuildText.Text = selected.Guild ?? "Sem guilda";
        VipText.Text = selected.Vip ? "ATIVO" : "-";
        CommandPanel.Visibility = selected.Command.HasValue ? Visibility.Visible : Visibility.Collapsed;
        if (selected.Command.HasValue) CommandText.Text = selected.Command.Value.ToString();
    }

    private void ApplyPersonalRanking(List<PersonalRankingEntry> rankings)
    {
        PersonalRankingItems.ItemsSource = rankings;
        NoRankingText.Visibility = rankings.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        NoRankingText.Text = "Sem ranking pessoal disponível ainda.";
    }

    private void ApplyGuild(GuildSummaryState? guild)
    {
        if (guild is null)
        {
            GuildNameText.Text = "Sem guilda";
            GuildRoleText.Text = GuildMasterText.Text = GuildScoreText.Text = "";
            return;
        }
        GuildNameText.Text = guild.GuildName;
        GuildRoleText.Text = guild.Role;
        GuildMasterText.Text = $"Guild Master: {guild.GuildMaster}";
        GuildScoreText.Text = $"Score {guild.Score:N0} · #{guild.GuildRank}";
    }

    private async Task ApplyClassIconsAsync()
    {
        var guildEmblem = await SlotImageResolver.ResolveAsync(_context, "account.guildEmblem", _context.Slots.GetAssetId("account.guildEmblem"), _context.Slots.GetImageState("account.guildEmblem"), CancellationToken.None);
        GuildEmblemHost.Background = guildEmblem is not null
            ? new ImageBrush(guildEmblem) { Stretch = Stretch.UniformToFill }
            : (Brush)Application.Current.Resources["Brush.BackgroundSurfaceAlt"];
    }

    private void Login_Click(object sender, RoutedEventArgs e) => _context.RequestLogin?.Invoke();
}
