using System;
using System.Linq;
using System.Threading.Tasks;
using Discord;
using Discord.Interactions;
using Quartermaster.Core.Data;
using Quartermaster.Core.Models;

namespace Quartermaster.Bot.Modules;

public class AdminModule : InteractionModuleBase<SocketInteractionContext>
{
    private readonly IDatabaseService _db;

    public AdminModule(IDatabaseService db)
    {
        _db = db;
    }

    [SlashCommand("addcommand", "Add a custom command")]
    [RequireUserPermission(GuildPermission.ManageGuild)]
    public async Task AddCommandAsync(string name, string response)
    {
        var commandName = name.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(commandName) || commandName.Contains(' '))
        {
            await RespondAsync("Command names must be a single word.", ephemeral: true);
            return;
        }

        await _db.AddCustomCommandAsync(new CustomCommand
        {
            GuildId = Context.Guild.Id.ToString(),
            CommandName = commandName,
            Response = response,
            CreatedBy = Context.User.Id.ToString(),
            CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        });

        await RespondAsync($"✅ Added custom command `{commandName}`.", ephemeral: true);
    }

    [SlashCommand("removecommand", "Remove a custom command")]
    [RequireUserPermission(GuildPermission.ManageGuild)]
    public async Task RemoveCommandAsync(string name)
    {
        var commandName = name.Trim().ToLowerInvariant();
        await _db.DeleteCustomCommandAsync(Context.Guild.Id.ToString(), commandName);
        await RespondAsync($"🗑️ Removed custom command `{commandName}`.", ephemeral: true);
    }

    [SlashCommand("listcommands", "List all custom commands")]
    public async Task ListCommandsAsync()
    {
        var commands = (await _db.GetCustomCommandsAsync(Context.Guild.Id.ToString())).ToList();
        if (commands.Count == 0)
        {
            await RespondAsync("No custom commands have been created yet.", ephemeral: true);
            return;
        }

        var embed = new EmbedBuilder()
            .WithTitle("Custom Commands")
            .WithColor(Color.Blue)
            .WithDescription(string.Join("\n", commands.Select(cmd => $"`{cmd.CommandName}` — {Truncate(cmd.Response, 80)}")))
            .WithFooter($"Total: {commands.Count}")
            .WithCurrentTimestamp()
            .Build();

        await RespondAsync(embed: embed, ephemeral: true);
    }

    private static string Truncate(string text, int length) =>
        text.Length <= length ? text : text[..length] + "...";
}
