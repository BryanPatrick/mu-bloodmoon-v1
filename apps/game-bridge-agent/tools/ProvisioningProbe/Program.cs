using System.Text.Json;
using BloodMoon.GameBridgeAgent.Commands;
using BloodMoon.GameBridgeAgent.GameDatabase;

if(args.Length!=2){Console.Error.WriteLine("Usage: ProvisioningProbe <command-json-file> <ledger-path>");return 2;}
var cs=Environment.GetEnvironmentVariable("BLOODMOON_WRITER_CONNECTION");if(string.IsNullOrWhiteSpace(cs)){Console.Error.WriteLine("Writer connection missing.");return 2;}
try{
 var command=JsonSerializer.Deserialize<CreateGameAccountCommand>(await File.ReadAllTextAsync(args[0]),new JsonSerializerOptions(JsonSerializerDefaults.Web))??throw new InvalidOperationException("INVALID_COMMAND");
 var ledger=new ProvisioningLedger(args[1]);await ledger.InitializeAsync(CancellationToken.None);var processor=new GameCommandProcessor(new SqlServerGameDatabaseWriter(cs),ledger);var result=await processor.ExecuteAsync(command,CancellationToken.None);Console.WriteLine(JsonSerializer.Serialize(new{version=1,ok=true,data=result,error=(object?)null},new JsonSerializerOptions(JsonSerializerDefaults.Web)));return 0;
}catch(Exception ex){Console.WriteLine(JsonSerializer.Serialize(new{version=1,ok=false,data=(object?)null,error=new{code=ex.Message}}));return 2;}
