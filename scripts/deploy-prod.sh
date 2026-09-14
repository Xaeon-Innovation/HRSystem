#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE, copy from .env.production.example and fill in domains/secrets."
  exit 1
fi

if ! grep -q '^INTEGRATION_SECRETS_KEY=' "$ENV_FILE" || grep -q '^INTEGRATION_SECRETS_KEY=$' "$ENV_FILE"; then
  echo "INTEGRATION_SECRETS_KEY is required for the new integrations feature."
  echo "Run: bash scripts/gen-prod-secrets.sh >> $ENV_FILE"
  echo "Then merge only the INTEGRATION_SECRETS_KEY line (do not duplicate JWT secrets)."
  exit 1
fi

echo "==> git pull"
git pull --ff-only

echo "==> rebuild and restart containers"
"${COMPOSE[@]}" up -d --build

echo "==> wait for API health"
for i in {1..30}; do
  if curl -fsS http://127.0.0.1:4000/health >/dev/null 2>&1; then
    echo "API healthy"
    break
  fi
  sleep 2
  if [[ $i -eq 30 ]]; then
    echo "API did not become healthy, check logs:"
    "${COMPOSE[@]}" logs --tail=80 api
    exit 1
  fi
done

echo "==> refresh plan features and metric definitions (idempotent)"
"${COMPOSE[@]}" exec -T api node packages/db/dist/seed.js

echo "==> status"
"${COMPOSE[@]}" ps

echo ""
echo "Done. Smoke test:"
echo "  curl -fsS http://127.0.0.1:4000/health"
echo "  open your app URL and log in as tenant admin (not super admin)"
