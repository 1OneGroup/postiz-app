#!/bin/bash
set -euo pipefail

# Postiz VPS Deploy Script
# Called by GitHub Actions after a new image is pushed to ghcr.io

APP_DIR="/home/postiz/app"
IMAGE="ghcr.io/1onegroup/postiz-app:latest"
COMPOSE_FILE="docker-compose.prod.yml"

cd "$APP_DIR"

echo "=== Pulling latest image ==="
docker pull "$IMAGE"

echo "=== Recreating postiz container (DB/Redis/Temporal stay running) ==="
docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate postiz

echo "=== Waiting for healthcheck ==="
TIMEOUT=120
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' postiz 2>/dev/null || echo "starting")
    if [ "$STATUS" = "healthy" ]; then
        echo "Postiz is healthy after ${ELAPSED}s"
        break
    fi
    echo "  Status: $STATUS (${ELAPSED}s / ${TIMEOUT}s)"
    sleep 5
    ELAPSED=$((ELAPSED + 5))
done

if [ "$STATUS" != "healthy" ]; then
    echo "WARNING: Healthcheck not healthy after ${TIMEOUT}s. Checking logs..."
    docker compose -f "$COMPOSE_FILE" logs --tail=50 postiz
    exit 1
fi

echo "=== Pruning old images ==="
docker image prune -f --filter "until=24h"

echo "=== Deploy complete ==="
docker compose -f "$COMPOSE_FILE" ps postiz
