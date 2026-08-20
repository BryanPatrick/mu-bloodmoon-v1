namespace BloodMoon.GameBridgeAgent.GameDatabase;

// Pure: builds parameter *names* (@name0, @name1, ...) from a count alone,
// never from the values themselves. This is what makes SQL injection
// structurally impossible in GetCharactersByNamesAsync's IN clause -- the
// generated CommandText can only ever depend on how many names there are,
// never on what they contain. The actual values are added separately as
// SqlParameter.Value and never touch CommandText.
public static class InClausePlaceholders
{
    public static IReadOnlyList<string> Build(int count)
    {
        if (count < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(count));
        }
        var names = new List<string>(count);
        for (var i = 0; i < count; i++)
        {
            names.Add($"@name{i}");
        }
        return names;
    }
}
