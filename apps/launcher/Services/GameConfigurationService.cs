using BloodMoon.Launcher.Models;
using Microsoft.Win32;

namespace BloodMoon.Launcher.Services;

public sealed class GameConfigurationService
{
    private const string RegistryPath = @"Software\Webzen\Mu\Config";

    public void Apply(LauncherSettings settings)
    {
        using var key = Registry.CurrentUser.CreateSubKey(RegistryPath, true)
            ?? throw new InvalidOperationException("Não foi possível abrir as configurações do jogo.");

        key.SetValue("WindowMode", settings.WindowMode ? 1 : 0, RegistryValueKind.DWord);
        key.SetValue("Resolution", settings.ResolutionIndex, RegistryValueKind.DWord);
        key.SetValue("LangSelection", settings.Language, RegistryValueKind.String);
        key.SetValue("MusicOnOFF", settings.MusicEnabled ? 1 : 0, RegistryValueKind.DWord);
        key.SetValue("SoundOnOFF", settings.SoundEnabled ? 1 : 0, RegistryValueKind.DWord);
        key.SetValue("VolumeLevel", Math.Clamp(settings.Volume, 0, 10), RegistryValueKind.DWord);
    }
}
