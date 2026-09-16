using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.AmbientLight;

public sealed class AmbientLightStartupService : IHostedService, IDisposable
{
    private readonly ILogger<AmbientLightStartupService> _logger;
    private Timer? _timer;

    public AmbientLightStartupService(ILogger<AmbientLightStartupService> logger)
    {
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _timer = new Timer(Register, null, TimeSpan.Zero, TimeSpan.FromSeconds(10));
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _timer?.Change(Timeout.InfiniteTimeSpan, Timeout.InfiniteTimeSpan);
        return Task.CompletedTask;
    }

    private void Register(object? state)
    {
        var plugin = Plugin.Instance;
        if (plugin is null)
        {
            return;
        }

        if (JavaScriptInjectorBridge.TryRegister(plugin))
        {
            _timer?.Change(Timeout.InfiniteTimeSpan, Timeout.InfiniteTimeSpan);
        }
        else
        {
            _logger.LogDebug("Ambient Light registration will be retried.");
        }
    }

    public void Dispose()
    {
        _timer?.Dispose();
    }
}
