using BloodMoon.GameBridgeAgent;
using BloodMoon.GameBridgeAgent.Commands;
using BloodMoon.GameBridgeAgent.Configuration;
using BloodMoon.GameBridgeAgent.GameDatabase;
using BloodMoon.GameBridgeAgent.Heartbeat;
using BloodMoon.GameBridgeAgent.Storage;
using BloodMoon.GameBridgeAgent.Transport;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

var builder = Host.CreateApplicationBuilder(args);
builder.Configuration.AddJsonFile("appsettings.json", optional: true, reloadOnChange: false);
builder.Configuration.AddEnvironmentVariables("BLOODMOON_AGENT_");

builder.Services.Configure<AgentOptions>(builder.Configuration.GetSection(AgentOptions.SectionName));

builder.Services.AddSingleton<IGameDatabaseReader>(sp =>
    new SqlServerGameDatabaseReader(sp.GetRequiredService<IOptions<AgentOptions>>().Value.SqlServerConnectionString));

builder.Services.AddSingleton<IGameDatabaseWriter>(sp =>
    new SqlServerGameDatabaseWriter(sp.GetRequiredService<IOptions<AgentOptions>>().Value.SqlServerWriterConnectionString));

builder.Services.AddSingleton(sp =>
{
    var options = sp.GetRequiredService<IOptions<AgentOptions>>().Value;
    return new AgentLocalStore(options.LocalStorePath, options.OutboxPendingHardCap);
});

builder.Services.AddSingleton<IGameDataTransport>(sp =>
{
    var options = sp.GetRequiredService<IOptions<AgentOptions>>().Value;
    return new GameDataClient(options.WorkerBaseUrl, options.AgentId, options.HmacSecret);
});

builder.Services.AddSingleton<IGameCommandTransport>(sp =>
{
    var options = sp.GetRequiredService<IOptions<AgentOptions>>().Value;
    return new GameCommandClient(options.WorkerBaseUrl, options.AgentId, options.CommandHmacSecret);
});
builder.Services.AddSingleton(sp =>
{
    var options = sp.GetRequiredService<IOptions<AgentOptions>>().Value;
    return new ProvisioningLedger(options.ProvisioningLedgerPath);
});
builder.Services.AddSingleton<IGameCredentialKeyProvider>(sp =>
{
    var options = sp.GetRequiredService<IOptions<AgentOptions>>().Value;
    return new DpapiGameCredentialKeyProvider(options.GameCredentialKeyRingPath);
});
builder.Services.AddSingleton<GameCredentialDecryptor>();
builder.Services.AddSingleton<GameCommandProcessor>();

builder.Services.AddSingleton(sp =>
{
    var options = sp.GetRequiredService<IOptions<AgentOptions>>().Value;
    return new HeartbeatPublisher(sp.GetRequiredService<IGameDataTransport>(), options.AgentId, options.ServerId);
});

builder.Services.AddHostedService<AgentWorker>();
builder.Services.AddHostedService<GameCommandWorker>();

var host = builder.Build();
await host.RunAsync();
