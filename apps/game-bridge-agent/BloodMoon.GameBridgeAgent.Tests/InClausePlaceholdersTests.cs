using BloodMoon.GameBridgeAgent.GameDatabase;
using Xunit;

namespace BloodMoon.GameBridgeAgent.Tests;

public class InClausePlaceholdersTests
{
    [Fact]
    public void Builds_one_placeholder_per_count_indexed_sequentially()
    {
        var result = InClausePlaceholders.Build(3);

        Assert.Equal(["@name0", "@name1", "@name2"], result);
    }

    [Fact]
    public void Zero_count_produces_no_placeholders()
    {
        Assert.Empty(InClausePlaceholders.Build(0));
    }

    // Structural injection-safety proof: placeholder names are derived
    // purely from the requested count, never from any value. A caller
    // cannot make a malicious character name appear in the generated
    // names themselves -- values only ever attach as a SqlParameter.Value
    // in SqlServerGameDatabaseReader, never as text here.
    [Theory]
    [InlineData(1)]
    [InlineData(10)]
    public void Placeholder_names_never_depend_on_any_external_value(int count)
    {
        var result = InClausePlaceholders.Build(count);

        Assert.All(result, name => Assert.Matches("^@name[0-9]+$", name));
    }
}
