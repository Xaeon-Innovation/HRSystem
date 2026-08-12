#!/bin/sh
set -eu

echo "Running database migrations..."
node packages/db/dist/migrate.js

echo "Starting API..."
exec node apps/api/dist/index.js
