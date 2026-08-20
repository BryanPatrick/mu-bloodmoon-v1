using BloodMoon.GameBridgeAgent.Ingestion;
using Xunit;

namespace BloodMoon.GameBridgeAgent.Tests;

public class ChangeDetectorTests
{
    [Fact]
    public void Unchanged_snapshot_produces_no_change()
    {
        var candidate = new DetectedChange("character-reset:c1", "character.reset-state", null, "c1", "{\"resetCount\":10}");
        var observed = new Dictionary<string, string> { ["character-reset:c1"] = "{\"resetCount\":10}" };

        var changes = ChangeDetector.Detect(new[] { candidate }, observed);

        Assert.Empty(changes);
    }

    [Fact]
    public void Changed_snapshot_produces_exactly_one_change()
    {
        var candidate = new DetectedChange("character-reset:c1", "character.reset-state", null, "c1", "{\"resetCount\":11}");
        var observed = new Dictionary<string, string> { ["character-reset:c1"] = "{\"resetCount\":10}" };

        var changes = ChangeDetector.Detect(new[] { candidate }, observed);

        var change = Assert.Single(changes);
        Assert.Equal("character-reset:c1", change.EntityKey);
        Assert.Equal("{\"resetCount\":11}", change.PayloadJson);
    }

    [Fact]
    public void Entity_never_seen_before_produces_a_change()
    {
        var candidate = new DetectedChange("character-reset:c2", "character.reset-state", null, "c2", "{\"resetCount\":0}");
        var observed = new Dictionary<string, string>();

        var changes = ChangeDetector.Detect(new[] { candidate }, observed);

        Assert.Single(changes);
    }

    [Fact]
    public void Mixed_batch_only_reports_the_entities_that_actually_changed()
    {
        var candidates = new[]
        {
            new DetectedChange("character-reset:c1", "character.reset-state", null, "c1", "{\"resetCount\":10}"),
            new DetectedChange("character-reset:c2", "character.reset-state", null, "c2", "{\"resetCount\":6}")
        };
        var observed = new Dictionary<string, string>
        {
            ["character-reset:c1"] = "{\"resetCount\":10}",
            ["character-reset:c2"] = "{\"resetCount\":5}"
        };

        var changes = ChangeDetector.Detect(candidates, observed);

        var change = Assert.Single(changes);
        Assert.Equal("character-reset:c2", change.EntityKey);
    }
}
