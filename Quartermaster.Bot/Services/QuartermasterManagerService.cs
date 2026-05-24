using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Quartermaster.Core.Services;

namespace Quartermaster.Bot.Services;

public class QuartermasterManagerService : BackgroundService
{
    private readonly ILogger<QuartermasterManagerService> _logger;
    private readonly IServiceProvider _services;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);

    public QuartermasterManagerService(ILogger<QuartermasterManagerService> logger, IServiceProvider services)
    {
        _logger = logger;
        _services = services;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Quartermaster Manager Service is starting...");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using (var scope = _services.CreateScope())
                {
                    var giveawayService = scope.ServiceProvider.GetRequiredService<GiveawayService>();
                    await giveawayService.CheckGiveawaysAsync();
                    
                    var voiceXpService = scope.ServiceProvider.GetRequiredService<VoiceXpService>();
                    await voiceXpService.RewardActiveUsersAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Quartermaster Manager loop");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }
    }
}
