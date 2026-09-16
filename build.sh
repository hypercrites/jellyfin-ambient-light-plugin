#!/usr/bin/env bash
set -euo pipefail

VERSION="1.0.1.0"
rm -rf dist
mkdir -p dist/package

dotnet publish Jellyfin.Plugin.AmbientLight.csproj \
  --configuration Release \
  --output dist/build \
  --no-self-contained

cp dist/build/Jellyfin.Plugin.AmbientLight.dll dist/package/
cp meta.json dist/package/

cd dist/package
zip -9 -j "../jellyfin-ambient-light-v${VERSION}.zip" \
  Jellyfin.Plugin.AmbientLight.dll \
  meta.json

echo "Created: dist/jellyfin-ambient-light-v${VERSION}.zip"
