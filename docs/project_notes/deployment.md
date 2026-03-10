# Postiz Deployment

## VPS Details
- **Provider:** Hostinger KVM 2
- **RAM:** 8GB
- **OS:** Debian
- **IP:** 72.61.170.222
- **SSH Port:** 2222
- **SSH User:** postiz
- **App URL:** http://72.61.170.222:5000
- **Git Repo:** https://github.com/1OneGroup/postiz-app.git

## CI/CD Pipeline
Push to `main` -> GitHub Actions builds Docker image -> pushes to ghcr.io/1onegroup/postiz-app:latest -> triggers deploy

### Deploy Layers (3-layer resilience)
1. **Webhook (primary):** GitHub Actions POSTs to http://VPS_IP:9443/deploy with Bearer token
2. **SSH fallback:** If webhook fails, falls back to SSH with 30s timeout + 10m command timeout
3. **Cron polling:** VPS checks for new Docker images every 5 min, auto-deploys if changed

### GitHub Secrets
| Secret | Purpose |
|--------|---------|
| VPS_HOST | 72.61.170.222 |
| VPS_PORT | 2222 |
| VPS_USER | postiz |
| VPS_SSH_KEY | ed25519 key (vps_postiz_key2) |
| DEPLOY_WEBHOOK_SECRET | Bearer token for webhook deploy |

## Docker Stack
| Service | Image | Memory | Port |
|---------|-------|--------|------|
| postiz | ghcr.io/1onegroup/postiz-app:latest | 3GB | 5000 |
| postiz-postgres | postgres:17-alpine | 512MB | 5432 |
| postiz-redis | redis:7.2 | 256MB | 6379 |
| temporal | temporalio/auto-setup:1.28.1 | 768MB | 7233 |
| temporal-postgresql | postgres:16 | - | 5433 |
| temporal-elasticsearch | elasticsearch:7.17.27 | 512MB | 9200 |

## VPS File Layout
- `/home/postiz/app/` - Application root
- `/home/postiz/app/docker-compose.prod.yml` - Production Docker stack
- `/home/postiz/app/scripts/deploy.sh` - Deploy script
- `/home/postiz/app/scripts/webhook-deploy.py` - Webhook listener
- `/home/postiz/app/scripts/auto-update.sh` - Cron polling fallback
- `/home/postiz/app/.env.production` - App environment
- `/home/postiz/app/.env.webhook` - Webhook secret (chmod 600)
- `/home/postiz/app/logs/` - Deploy and webhook logs

## Healthcheck
- Docker healthcheck: Node.js fetch to localhost:5000 every 30s
- Deploy script: 300s timeout with HTTP fallback after 60s

## Backup
- `scripts/backup.sh` - Backs up both PostgreSQL DBs + uploads volume
- 14-day retention, designed for daily cron at 3 AM
