#!/bin/bash
set -euo pipefail

IMAGE="ghcr.io/1onegroup/postiz-app:latest"
LOCKFILE="/tmp/postiz-deploy.lock"
LOGFILE="/home/postiz/app/logs/auto-update.log"

# Prevent concurrent deploys
exec 9>"$LOCKFILE"
if ! flock -n 9; then
    exit 0
fi

# Create log directory if missing
mkdir -p "$(dirname "$LOGFILE")"

# Get current image digest
CURRENT_DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' "$IMAGE" 2>/dev/null || echo "none")

# Pull latest image
docker pull "$IMAGE" > /dev/null 2>&1

# Get new digest after pull
NEW_DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' "$IMAGE" 2>/dev/null || echo "none")

# Deploy if digest changed
if [ "$CURRENT_DIGEST" != "$NEW_DIGEST" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] New image detected. Deploying..." >> "$LOGFILE"
    cd /home/postiz/app && bash scripts/deploy.sh
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deploy complete." >> "$LOGFILE"
fi

# Cron: */5 * * * * /home/postiz/app/scripts/auto-update.sh
