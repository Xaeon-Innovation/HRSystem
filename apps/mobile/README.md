# Polara Field (`@hr/mobile`)

Expo (dev client) app. Specs: [`docs/mobile/`](../../docs/mobile/). Prototype: [`design/elevora-mobile-prototype/`](../../design/elevora-mobile-prototype/).

## Setup

```bash
pnpm install
pnpm --filter @hr/mobile start
```

Use a development build (`expo-dev-client`), not Expo Go, once MapLibre / background location land.

## Env

- `EXPO_PUBLIC_API_URL` — API base (default `http://localhost:4000`)
- `APP_ENV` — `development` | `staging` | `production`
