using Discord;
using Discord.Commands;
using Discord.Interactions;
using Discord.WebSocket;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Quartermaster.Bot;
using Quartermaster.Core.Data;

var builder = Host.CreateApplicationBuilder(args);

// Add service support
builder.Services.AddWindowsService(options => options.ServiceName = "QuartermasterBot");
builder.Services.AddSystemd();

// Robust configuration loading
string configName = "appsettings.json";
string configPath = "";

// 1. Check current directory
if (File.Exists(configName)) configPath = Path.GetFullPath(configName);
// 2. Check execution directory
else if (File.Exists(Path.Combine(AppContext.BaseDirectory, configName))) configPath = Path.Combine(AppContext.BaseDirectory, configName);
// 3. Check parent directory (for solution-level config)
else if (File.Exists(Path.Combine("..", configName))) configPath = Path.GetFullPath(Path.Combine("..", configName));

if (string.IsNullOrEmpty(configPath))
{
    Console.WriteLine("❌ ERROR: appsettings.json not found in current, base, or parent directory!");
    return;
}

builder.Configuration.AddJsonFile(configPath, optional: false, reloadOnChange: true);

// Configuration
builder.Services.Configure<BotConfiguration>(builder.Configuration.GetSection("Bot"));

// Discord Services
var config = new DiscordSocketConfig
{
    GatewayIntents = GatewayIntents.AllUnprivileged | GatewayIntents.MessageContent | GatewayIntents.GuildMembers,
    AlwaysDownloadUsers = true
};
builder.Services.AddSingleton(config);
builder.Services.AddSingleton<DiscordSocketClient>();
builder.Services.AddSingleton(x => new CommandService());
builder.Services.AddSingleton(x => new InteractionService(x.GetRequiredService<DiscordSocketClient>()));

// Data Services
var dbPath = builder.Configuration.GetValue<string>("Bot:DatabasePath") ?? "bot.db";
var dbService = new SqliteDatabaseService(dbPath);
await dbService.InitializeDatabaseAsync();
builder.Services.AddSingleton<IDatabaseService>(dbService);

// Core Logic Services
builder.Services.AddSingleton<Quartermaster.Core.Services.LevelingService>();
builder.Services.AddSingleton<Quartermaster.Bot.Services.AutomodService>();
builder.Services.AddSingleton<Quartermaster.Core.Services.TriggerService>();
builder.Services.AddSingleton<Quartermaster.Core.Services.GiveawayService>();
builder.Services.AddSingleton<Quartermaster.Core.Services.VoiceXpService>();
builder.Services.AddSingleton<Quartermaster.Core.Services.StarboardService>();
builder.Services.AddSingleton<Quartermaster.Core.Services.VisualService>();

builder.Services.AddHttpClient();

// Bot Background Services
builder.Services.AddHostedService<DiscordBotService>();
builder.Services.AddHostedService<Quartermaster.Bot.Services.QuartermasterManagerService>();

using IHost host = builder.Build();
await host.RunAsync();
