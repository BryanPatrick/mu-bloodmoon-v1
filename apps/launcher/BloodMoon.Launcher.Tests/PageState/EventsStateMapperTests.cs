using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using Xunit;

namespace BloodMoon.Launcher.Tests.PageState;

public sealed class EventsStateMapperTests
{
    [Fact]
    public void Build_WithNoEvents_ReturnsEmptyListsNotAnError()
    {
        var state = EventsStateMapper.Build(activeEvent: null, upcoming: [], monthly: []);

        Assert.Null(state.ActiveEvent);
        Assert.Empty(state.UpcomingEvents);
        Assert.Empty(state.MonthlyCalendar);
    }

    [Fact]
    public void Build_OrdersUpcomingEventsByStartTime()
    {
        var now = DateTimeOffset.UtcNow;
        List<UpcomingEventState> upcoming =
        [
            new() { Name = "Later", StartsAt = now.AddDays(3) },
            new() { Name = "Sooner", StartsAt = now.AddHours(1) },
            new() { Name = "Middle", StartsAt = now.AddDays(1) }
        ];

        var state = EventsStateMapper.Build(null, upcoming, []);

        Assert.Equal(["Sooner", "Middle", "Later"], state.UpcomingEvents.Select(e => e.Name));
    }

    [Fact]
    public void Build_OrdersMonthlyCalendarByDate()
    {
        List<MonthlyEventEntryState> monthly =
        [
            new() { Date = new DateOnly(2026, 9, 20), Name = "Late" },
            new() { Date = new DateOnly(2026, 9, 1), Name = "Early" }
        ];

        var state = EventsStateMapper.Build(null, [], monthly);

        Assert.Equal(["Early", "Late"], state.MonthlyCalendar.Select(e => e.Name));
    }
}
