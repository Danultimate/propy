#!/bin/bash
# Run on your VPS to deploy or update Propy
set -e

cd /opt/propy

echo ">>> Pulling latest code..."
git pull

echo ">>> Building containers..."
docker compose -f docker-compose.prod.yml build

echo ">>> Running database migrations..."
docker compose -f docker-compose.prod.yml run --rm backend \
  alembic upgrade head

echo ">>> Restarting services..."
docker compose -f docker-compose.prod.yml up -d

echo ">>> Done. Propy is live."
