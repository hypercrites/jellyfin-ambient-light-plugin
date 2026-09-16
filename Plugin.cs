using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.AmbientLight;

public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
        ApplicationPaths = applicationPaths;
    }

    public static Plugin? Instance { get; private set; }

    public IApplicationPaths ApplicationPaths { get; }

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
                Name = "Jellyfin Ambient Light",
                DisplayName = "Jellyfin Ambient Light",
                EmbeddedResourcePath = $"{GetType().Namespace}.Configuration.configPage.html",
                EnableInMainMenu = false
            }
        ];
    }

    public override void OnUninstalling()
    {
        WebInjector.Remove(ApplicationPaths.WebPath);
        base.OnUninstalling();
    }
}

internal static class WebInjector
{
    private const string StartMarker = "<!-- JF_AMBIENT_LIGHT_START -->";
    private const string EndMarker = "<!-- JF_AMBIENT_LIGHT_END -->";
    private const string ResourceName = "Jellyfin.Plugin.AmbientLight.Web.ambient-light.js";

    public static void EnsureInjected(string webPath)
    {
        var indexPath = Path.Combine(webPath, "index.html");

        if (!File.Exists(indexPath))
        {
            return;
        }

        var script = LoadScript();
        var block = $"{StartMarker}<script>{script}</script>{EndMarker}";
        var content = File.ReadAllText(indexPath);
        var cleaned = RemoveExistingBlock(content);

        var bodyIndex = cleaned.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        if (bodyIndex < 0)
        {
            return;
        }

        var updated = cleaned.Insert(bodyIndex, block);
        if (!string.Equals(content, updated, StringComparison.Ordinal))
        {
            File.WriteAllText(indexPath, updated);
        }
    }

    public static void Remove(string webPath)
    {
        var indexPath = Path.Combine(webPath, "index.html");

        if (!File.Exists(indexPath))
        {
            return;
        }

        var content = File.ReadAllText(indexPath);
        var cleaned = RemoveExistingBlock(content);

        if (!string.Equals(content, cleaned, StringComparison.Ordinal))
        {
            File.WriteAllText(indexPath, cleaned);
        }
    }

    private static string RemoveExistingBlock(string content)
    {
        var pattern = Regex.Escape(StartMarker) + "[\\s\\S]*?" + Regex.Escape(EndMarker);
        return Regex.Replace(content, pattern, string.Empty, RegexOptions.Multiline);
    }

    private static string LoadScript()
    {
        var assembly = typeof(WebInjector).Assembly;

        using var stream = assembly.GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException($"Embedded resource '{ResourceName}' was not found.");

        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }
}
