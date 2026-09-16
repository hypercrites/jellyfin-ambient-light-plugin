# Jellyfin Ambient Light

Jellyfin Ambient Light adds a client-side blurred background to the Jellyfin web player. The current video frame is copied to a small canvas, enlarged and blurred behind the normal player image to fill letterbox and pillarbox areas.

The video is not re-encoded and the server does not process video frames.

## Requirements

- Jellyfin 12.x
- JavaScript Injector 4.0.0.0 or newer

The plugin registers its browser script through the JavaScript Injector plugin's public registration interface. It does not modify Jellyfin web files on disk.

## Defaults

- Enabled by default: true
- Player button: true
- Blur: 100 px
- FPS: 12
- Opacity: 90%
- Scale: 1.08
- Canvas: 320x180

Server settings provide defaults. The player button stores the user's choice in browser localStorage so each browser can enable or disable the effect independently.

## Installation

Add the raw repository manifest to Jellyfin:

`https://raw.githubusercontent.com/hypercrites/jellyfin-ambient-light-plugin/main/manifest.json`

Then install Jellyfin Ambient Light from the plugin catalog and restart Jellyfin.

## Build

The project targets .NET 10 and Jellyfin 12.1 packages. The .NET SDK is only required on the build machine or by GitHub Actions, not on the Jellyfin server.

```bash
dotnet publish Jellyfin.Plugin.AmbientLight.csproj -c Release -o dist/build --no-self-contained
```

## Release

Create a GitHub tag such as `v1.0.1.0`. GitHub Actions builds and publishes the release ZIP automatically. Copy the MD5 shown in the release notes into the matching `manifest.json` version entry.
