# Reviewer demo account

Stores share one seeded Field employee. Seed keeps it store-ready (`presenceMode = mobile` + today’s shift).

## Credentials

| Field | Value |
| --- | --- |
| Workspace slug | `acme` |
| Email | `employee@acme.local` |
| Password | `Employee123!` |
| Presence | `mobile` (background / Always location path) |
| Entitlements | Field ops via trial/ops plan modules (`liveMap` / `teamToday`) |

Admin (internal only): `admin@acme.local` / `Admin123!`

## Prepare database

Against the API environment the store build will hit (`APP_ENV=production` → `elevora-api.xaeons.com`, or staging):

```bash
# From monorepo root, with DATABASE_URL pointing at that environment:
pnpm db:seed
```

Seed is idempotent. It will:

1. Ensure `employee@acme.local` exists  
2. Set `presence_mode = mobile` and clear geofence columns (Always-location demo)  
3. Upsert a **today** `shift_instances` row (08:00–17:00 local) so Today / OT paths have data  

## Verify via API

Replace `API` with your base (e.g. `https://elevora-api.xaeons.com` or `http://127.0.0.1:4000`).

```bash
API="${API:-http://127.0.0.1:4000}"

# 1) Workspace
curl -sS -X POST "$API/v1/mobile/auth/workspace" \
  -H 'content-type: application/json' \
  -d '{"slug":"acme"}' | jq .

# 2) Login (or use verify-reviewer-demo.sh)
DEVICE=$(uuidgen | tr '[:upper:]' '[:lower:]')
LOGIN=$(curl -sS -X POST "$API/v1/mobile/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"slug\":\"acme\",\"email\":\"employee@acme.local\",\"password\":\"Employee123!\",\"device\":{\"id\":\"$DEVICE\",\"platform\":\"android\",\"model\":\"store-review\",\"appVersion\":\"1.0.0\"}}")
echo "$LOGIN" | jq '{mustChangePassword, hasToken: (.accessToken != null)}'

TOKEN=$(echo "$LOGIN" | jq -r .accessToken)

# 3) Me — expect presenceMode mobile + fieldOps true
curl -sS "$API/v1/mobile/me" -H "authorization: Bearer $TOKEN" | jq '{
  email: .user.email,
  presenceMode,
  zones,
  entitlements
}'
```

**Pass criteria**

- `presenceMode` === `"mobile"`
- `entitlements.fieldOps` === `true`
- Login succeeds without forced password change blocking the flow (`mustChangePassword` should be false for the seeded employee)

## Staging vs production

| Env | API | Notes |
| --- | --- | --- |
| Local | `http://127.0.0.1:4000` | Dev / video practice |
| Staging | `https://elevora-api.xaeons.com` | Prefer for first store submit if prod not ready |
| Production | `https://elevora-api.xaeons.com` | Required for production store builds |

Point the store build with `APP_ENV` / `EXPO_PUBLIC_API_URL` and re-seed **that** database before inviting reviewers.

## Simulated GPS (device)

- **Android:** Extended controls or mock location app — any outdoor fix is fine for `mobile` presence (no geofence block).  
- **iOS:** Features → Location → Custom Location; Dubai Marina `25.0805, 55.1403` matches older fixed-zone demos if you temporarily switch the employee back to `fixed_zone`.

## After review

You may leave `acme` as a permanent demo tenant or rotate the password and update Review notes. Do not use a real customer tenant for Apple/Google reviewers.
