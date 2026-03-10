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
TIMEOUT=300
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' postiz 2>/dev/null || echo "starting")
    if [ "$STATUS" = "healthy" ]; then
        echo "Postiz is healthy after ${ELAPSED}s"
        break
    fi
    # Also check if app is serving requests (responds before Docker healthcheck passes)
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/ 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" != "000" ] && [ "$HTTP_CODE" != "502" ] && [ $ELAPSED -gt 60 ]; then
        echo "Postiz is serving requests (HTTP $HTTP_CODE) after ${ELAPSED}s"
        break
    fi
    echo "  Status: $STATUS, HTTP: $HTTP_CODE (${ELAPSED}s / ${TIMEOUT}s)"
    sleep 10
    ELAPSED=$((ELAPSED + 10))
done

if [ "$STATUS" != "healthy" ] && [ "$HTTP_CODE" = "000" ]; then
    echo "ERROR: Postiz not responding after ${TIMEOUT}s. Checking logs..."
    docker compose -f "$COMPOSE_FILE" logs --tail=50 postiz
    exit 1
fi

echo "=== Pruning old images ==="
# Remove all dangling (untagged) images — these are old builds replaced by :latest
docker image prune -f
# Remove any unused images not referenced by running containers
docker image prune -a -f --filter "until=2h"

echo "=== Deploy complete ==="
docker compose -f "$COMPOSE_FILE" ps postiz
