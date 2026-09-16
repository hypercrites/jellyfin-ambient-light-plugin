using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.AmbientLight;

public sealed class AmbientLightStartupService : IHostedService, IDisposable
{
    private readonly ILogger<AmbientLightStartupService> _logger;
    private readonly MediaBrowser.Common.Configuration.IApplicationPaths _applicationPaths;
    private Timer? _timer;

    public AmbientLightStartupService(
        MediaBrowser.Common.Configuration.IApplicationPaths applicationPaths,
        ILogger<AmbientLightStartupService> logger)
    {
        _applicationPaths = applicationPaths;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        EnsureInjected(null);
        _timer = new Timer(
            EnsureInjected,
            null,
            TimeSpan.FromSeconds(15),
            TimeSpan.FromSeconds(30));
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _timer?.Change(Timeout.InfiniteTimeSpan, Timeout.InfiniteTimeSpan);
        return Task.CompletedTask;
    }

    private void EnsureInjected(object? state)
    {
        try
        {
            WebInjector.EnsureInjected(_applicationPaths.WebPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to inject Jellyfin Ambient Light into the Jellyfin web client.");
        }
    }

    public void Dispose()
    {
        _timer?.Dispose();
    }
}
