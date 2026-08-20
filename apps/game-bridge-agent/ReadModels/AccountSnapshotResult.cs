namespace BloodMoon.GameBridgeAgent.ReadModels;

// Never silently pick an ownership answer when something looks wrong
// (Part M/N). Callers must branch on Status -- there is no way to reach
// Model without checking it first.
public sealed class AccountSnapshotResult
{
    public enum ResultStatus
    {
        Ok,
        AccountNotFound,
        Inconsistent
    }

    public ResultStatus Status { get; }
    public GameAccountReadModel? Model { get; }
    public string? InconsistencyReason { get; }

    private AccountSnapshotResult(ResultStatus status, GameAccountReadModel? model, string? inconsistencyReason)
    {
        Status = status;
        Model = model;
        InconsistencyReason = inconsistencyReason;
    }

    public static AccountSnapshotResult Ok(GameAccountReadModel model) => new(ResultStatus.Ok, model, null);

    public static AccountSnapshotResult AccountNotFound() => new(ResultStatus.AccountNotFound, null, null);

    // reason must never contain a character/account name -- see AccountSnapshotReader.
    public static AccountSnapshotResult Inconsistent(string reason) => new(ResultStatus.Inconsistent, null, reason);
}
