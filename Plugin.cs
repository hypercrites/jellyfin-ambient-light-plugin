using System.Reflection;
using System.Runtime.Loader;
using Newtonsoft.Json.Linq;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.AmbientLight;

public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    private const string ScriptId = "b40b0a76-4ff2-4b39-a35b-5d1193e3f0c7-ambient-light";
    private const string ScriptResourceName = "Jellyfin.Plugin.AmbientLight.Web.ambient-light.js";
    private readonly ILogger<Plugin> _logger;

    public Plugin(
        MediaBrowser.Common.Configuration.IApplicationPaths applicationPaths,
        IXmlSerializer xmlSerializer,
        ILogger<Plugin> logger)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
        _logger = logger;
    }

    public static Plugin? Instance { get; private set; }

    public override string Name => "Jellyfin Ambient Light";

    public override Guid Id => Guid.Parse("b40b0a76-4ff2-4b39-a35b-5d1193e3f0c7");

    public override string Description =>
        "Adds a client-side blurred video background to fill letterbox and pillarbox areas.";

    public IEnumerable<PluginPageInfo> GetPages()
    {
        return
        [
            new PluginPageInfo
            {
                Name = Name,
                DisplayName = Name,
                EmbeddedResourcePath = $"{GetType().Namespace}.Configuration.configPage.html",
                EnableInMainMenu = false,
                MenuIcon = "blur_on"
            }
        ];
    }

    internal string GetScript()
    {
        var assembly = GetType().Assembly;

        using var stream = assembly.GetManifestResourceStream(ScriptResourceName)
            ?? throw new InvalidOperationException($"Embedded resource '{ScriptResourceName}' was not found.");

        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    internal string GetScriptId() => ScriptId;

    internal void LogDebug(string message, params object?[] args) => _logger.LogDebug(message, args);
    internal void LogInformation(string message, params object?[] args) => _logger.LogInformation(message, args);
    internal void LogWarning(string message, params object?[] args) => _logger.LogWarning(message, args);
    internal void LogError(Exception exception, string message, params object?[] args) => _logger.LogError(exception, message, args);
}

internal static class JavaScriptInjectorBridge
{
    private const string InjectorAssemblyName = "Jellyfin.Plugin.JavaScriptInjector";
    private static Type? _interfaceType;

    public static bool TryRegister(Plugin plugin)
    {
        try
        {
            var interfaceType = FindInterfaceType();
            if (interfaceType is null)
            {
                plugin.LogWarning("JavaScript Injector was not found. Jellyfin Ambient Light JavaScript was not registered.");
                return false;
            }

            var method = interfaceType.GetMethod("RegisterScript", BindingFlags.Public | BindingFlags.Static);
            if (method is null)
            {
                plugin.LogWarning("JavaScript Injector was found, but RegisterScript is unavailable.");
                return false;
            }

            var payload = new JObject
            {
                ["id"] = plugin.GetScriptId(),
                ["name"] = plugin.Name,
                ["script"] = plugin.GetScript(),
                ["enabled"] = true,
                ["requiresAuthentication"] = false,
                ["pluginId"] = plugin.Id.ToString(),
                ["pluginName"] = plugin.Name,
                ["pluginVersion"] = typeof(Plugin).Assembly.GetName().Version?.ToString() ?? "1.0.4.0"
            };

            var result = method.Invoke(null, [payload]);
            if (result is true)
            {
                plugin.LogInformation("Ambient Light JavaScript registered with JavaScript Injector.");
                return true;
            }

            plugin.LogWarning("JavaScript Injector rejected the Ambient Light script registration.");
            return false;
        }
        catch (Exception ex)
        {
            plugin.LogError(ex, "Failed to register Ambient Light JavaScript with JavaScript Injector.");
            return false;
        }
    }

    public static bool TryUnregister(Plugin plugin)
    {
        try
        {
            var interfaceType = FindInterfaceType();
            if (interfaceType is null)
            {
                return false;
            }

            var method = interfaceType.GetMethod("UnregisterAllScriptsFromPlugin", BindingFlags.Public | BindingFlags.Static);
            if (method is null)
            {
                return false;
            }

            var result = method.Invoke(null, [plugin.Id.ToString()]);
            if (result is int removedCount)
            {
                plugin.LogInformation("Removed {Count} Ambient Light JavaScript registration(s).", removedCount);
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            plugin.LogError(ex, "Failed to unregister Ambient Light JavaScript from JavaScript Injector.");
            return false;
        }
    }

    private static Type? FindInterfaceType()
    {
        if (_interfaceType is not null)
        {
            return _interfaceType;
        }

        var assembly = AssemblyLoadContext.All
            .SelectMany(context => context.Assemblies)
            .FirstOrDefault(assembly =>
                string.Equals(assembly.GetName().Name, InjectorAssemblyName, StringComparison.OrdinalIgnoreCase));

        _interfaceType = assembly?.GetType("Jellyfin.Plugin.JavaScriptInjector.PluginInterface");
        return _interfaceType;
    }
}
