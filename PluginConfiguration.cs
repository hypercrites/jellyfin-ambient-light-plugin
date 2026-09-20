using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.AmbientLight;

public sealed class PluginConfiguration : BasePluginConfiguration
{
    public PluginConfiguration()
    {
        EnabledByDefault = true;
        ShowPlayerButton = true;
        Blur = 100;
        Fps = 12;
        Opacity = 90;
        Scale = 1.08;
        TemporalSmoothing = 45;
    }

    public bool EnabledByDefault { get; set; }

    public bool ShowPlayerButton { get; set; }

    public int Blur { get; set; }

    public int Fps { get; set; }

    public int Opacity { get; set; }

    public double Scale { get; set; }

    public int TemporalSmoothing { get; set; }
}
