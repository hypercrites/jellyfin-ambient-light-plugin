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

## ABI

The Jellyfin 12 plugin ABI lane is `12.0.0.0`; Jellyfin 12.1.x is built against that lane. Plugin packages therefore advertise `12.0.0.0` as their `targetAbi`.

## AI

I build this with AI, for me. If you are against AI, just don't use it. ¯\_(ツ)_/¯
