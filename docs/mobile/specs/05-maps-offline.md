# 05 — Maps and offline packs

Prototype screens: `map`, `map-team`, `offline-maps`, `map-select`.

## MapView

MapLibre with Elevora light/dark style JSON (token colors). Layers:

- Work zone circle (GeoJSON from employee geofence center + radius); accent fill ~13%, dashed accent-strong stroke.
- Today’s route from local `location_points`.
- You marker (info blue + halo).
- Team markers (managers): accent on shift, warn late, grey last seen.
- OSM attribution in corner.

## Offline packs

Public OSM raster/vector tile servers **do not allow** bulk offline caching. Default: **self-hosted** vector tiles (Protomaps/Planetiler for target regions, e.g. UAE + Egypt) at `https://tiles.elevora.app/{z}/{x}/{y}.mvt` (or staging equivalent) + `elevora-light.json` / `elevora-dark.json`.

`OfflineManager.createPack({ name, styleURL, bounds, minZoom: 10, maxZoom: 16|17 })`.

- List packs: size, status, progress, delete, refresh.
- Area picker estimates size before download.
- Auto-download upcoming shift zones on Wi-Fi.
- Refresh packs older than 30 days.
- Storage cap setting default 500 MB.
- Onboarding: Wi-Fi only by default; skippable.

## Team map

Join existing WebSocket with `/v1/mobile/realtime/token`. Fallback: poll `/v1/mobile/team/presence` every 30s. Offline: last known + “Last seen”.

## Regions API

`GET /v1/mobile/map/regions` returns suggested bounding boxes around the user’s geofence and upcoming shift locations, plus style URLs.
