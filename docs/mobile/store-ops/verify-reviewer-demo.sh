#!/usr/bin/env bash
# Verify store-reviewer demo against a running API.
# Usage: API=http://127.0.0.1:4000 ./docs/mobile/store-ops/verify-reviewer-demo.sh
set -euo pipefail

API="${API:-http://127.0.0.1:4000}"
EMAIL="${EMAIL:-employee@acme.local}"
PASSWORD="${PASSWORD:-Employee123!}"
SLUG="${SLUG:-acme}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

echo "== workspace =="
curl -sS -X POST "$API/v1/mobile/auth/workspace" \
  -H 'content-type: application/json' \
  -d "{\"slug\":\"$SLUG\"}" | jq '{slug: .slug, name: .name}'

DEVICE="$(
  if command -v uuidgen >/dev/null 2>&1; then uuidgen | tr '[:upper:]' '[:lower:]'
  else python3 -c 'import uuid; print(uuid.uuid4())'
  fi
)"

echo "== login =="
LOGIN="$(curl -sS -X POST "$API/v1/mobile/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"slug\":\"$SLUG\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"device\":{\"id\":\"$DEVICE\",\"platform\":\"android\",\"model\":\"store-verify\",\"appVersion\":\"1.0.0\"}}")"

TOKEN="$(echo "$LOGIN" | jq -r '.accessToken // empty')"
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "$LOGIN" | jq . >&2
  echo "Login failed" >&2
  exit 1
fi
echo "$LOGIN" | jq '{mustChangePassword, hasToken: true}'

echo "== me =="
ME="$(curl -sS "$API/v1/mobile/me" -H "authorization: Bearer $TOKEN")"
echo "$ME" | jq '{
  email: .user.email,
  presenceMode,
  zoneCount: (.zones|length),
  fieldOps: .entitlements.fieldOps,
  liveMap: .entitlements.liveMap
}'

PRESENCE="$(echo "$ME" | jq -r '.presenceMode')"
FIELD="$(echo "$ME" | jq -r '.entitlements.fieldOps')"

if [[ "$PRESENCE" != "mobile" ]]; then
  echo "FAIL: presenceMode must be mobile (got $PRESENCE). Run: pnpm db:seed" >&2
  exit 1
fi
if [[ "$FIELD" != "true" ]]; then
  echo "FAIL: entitlements.fieldOps must be true" >&2
  exit 1
fi

echo "OK — reviewer demo ready on $API"
