using System.Threading.Tasks;
using Discord;
using Discord.Interactions;

namespace Quartermaster.Bot.Modules;

public class HelpModule : InteractionModuleBase<SocketInteractionContext>
{
    [SlashCommand("help", "Show all available bot commands")]
    public async Task HelpAsync()
    {
        var embed = new EmbedBuilder()
            .WithTitle("📚 Quartermaster Command Guide")
            .WithColor(Color.Blue)
            .WithDescription("Use slash commands to manage your server, economy, and community tools.")
            .AddField("Moderation", "`/warn`, `/warnings`, `/clearwarnings`, `/kick`, `/ban`, `/mute`, `/unmute`, `/tempban`, `/raidprotection`, `/raidlogs`, `/endlockdown`", false)
            .AddField("Economy", "`/balance`, `/daily`, `/coinflip`, `/blackjack`, `/giveaway start`", false)
            .AddField("Leveling", "`/rank`, `/leaderboard`", false)
            .AddField("Utility", "`/help`, `/server-summary`, `/addcommand`, `/removecommand`, `/listcommands`", false)
            .WithFooter("Quartermaster .NET")
            .WithCurrentTimestamp()
            .Build();

        await RespondAsync(embed: embed, ephemeral: true);
    }
}
