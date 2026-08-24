namespace BloodMoon.Launcher.Services;

// Part AA/Q -- event countdowns are computed locally from a timezone-aware
// DateTimeOffset target (never an ambiguous local timestamp; see
// docs/launcher/page-data-contracts.md's time-handling note). No
// server-timezone guessing lives here.
public static class CountdownFormatter
{
    public static TimeSpan Remaining(DateTimeOffset target)
    {
        var delta = target - DateTimeOffset.UtcNow;
        return delta > TimeSpan.Zero ? delta : TimeSpan.Zero;
    }

    public static string Format(DateTimeOffset target)
    {
        var remaining = Remaining(target);
        if (remaining <= TimeSpan.Zero)
        {
            return "Encerrado";
        }
        if (remaining.TotalDays >= 1)
        {
            return $"{(int)remaining.TotalDays}d {remaining.Hours}h";
        }
        if (remaining.TotalHours >= 1)
        {
            return $"{(int)remaining.TotalHours}h {remaining.Minutes}m";
        }
        return $"{(int)remaining.TotalMinutes}m {remaining.Seconds}s";
    }
}
