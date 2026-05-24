using Discord;
using Discord.Commands;
using Discord.Interactions;
using Discord.WebSocket;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Quartermaster.Bot;
using Quartermaster.Core.Data;

var builder = Host.CreateApplicationBuilder(args);

// Load global configuration from solution root
builder.Configuration.AddJsonFile("../appsettings.json", optional: false, reloadOnChange: true);

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
builder.Services.AddSingleton<CommandService>();
builder.Services.AddSingleton<InteractionService>();

// Data Services
var dbPath = builder.Configuration.GetValue<string>("Bot:DatabasePath") ?? "bot.db";
builder.Services.AddSingleton<IDatabaseService>(new SqliteDatabaseService(dbPath));

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
