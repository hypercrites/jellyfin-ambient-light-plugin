# Jellyfin Ambient Light

Jellyfin Ambient Light adds a client-side ambient background to the Jellyfin web player. The current video frame is copied to a small canvas, enlarged and blurred behind the normal player image. The effect fills letterbox and pillarbox areas.

The video is not re-encoded and the server does not process video frames.

## Features

- Jellyfin 12.x
- Client-side rendering
- 320x180 canvas
- 12 FPS default
- 100 px blur default
- 90% opacity default
- 1.08x background scale default
- Optional player button
- Per-browser on/off state
- Server-side settings page
- Player replacement / SPA navigation recovery

## Repository installation

1. Push this project to a public GitHub repository.
2. Create a GitHub Release for the version from `meta.json`.
3. Upload the packaged release ZIP.
4. Set `sourceUrl` and `checksum` in `manifest.json` to that release ZIP.
5. In Jellyfin open Dashboard -> Plugins -> Repositories.
6. Add the raw URL to this repository's `manifest.json`.
7. Install `Jellyfin Ambient Light` from the plugin catalog.
8. Restart Jellyfin.

## Configuration

Open Dashboard -> Plugins -> Jellyfin Ambient Light.

Defaults:

- Enabled by default: true
- Player button: true
- Blur: 100 px
- FPS: 12
- Opacity: 90%
- Scale: 1.08

The server settings define the defaults for clients. The player button stores the user's on/off state in browser localStorage, so one user can disable the effect without changing it for other users.

## Client scope

The effect is available to Jellyfin web clients. Native clients which do not load the Jellyfin web interface are not modified.

## Build

The plugin targets .NET 10 and Jellyfin 12.1.0 packages. The .NET SDK is required only on the build machine, not on the Jellyfin server.

```bash
dotnet build -c Release
```

## ABI

The Jellyfin 12 plugin ABI lane is `12.0.0.0`; Jellyfin 12.1.x is built against that lane. Plugin packages therefore advertise `12.0.0.0` as their `targetAbi`.
