#!/usr/bin/env bash
# Print random production secrets to paste into .env.production
# Usage: bash scripts/gen-prod-secrets.sh
set -euo pipefail

rand() {
  openssl rand -base64 48 | tr -d '\n' | tr '+/' '-_'
}

echo "# Paste these into .env.production (do not commit):"
echo "POSTGRES_PASSWORD=$(rand)"
echo "JWT_SECRET=$(rand)"
echo "JWT_REFRESH_SECRET=$(rand)"
echo "SEED_SUPER_ADMIN_PASSWORD=$(rand)"
