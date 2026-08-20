using BloodMoon.GameBridgeAgent;
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

builder.Services.AddSingleton(sp =>
{
    var options = sp.GetRequiredService<IOptions<AgentOptions>>().Value;
    return new HeartbeatPublisher(sp.GetRequiredService<IGameDataTransport>(), options.AgentId, options.ServerId);
});

builder.Services.AddHostedService<AgentWorker>();

var host = builder.Build();
await host.RunAsync();
