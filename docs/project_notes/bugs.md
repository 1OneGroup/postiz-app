# Bug Solutions Log

## BUG-001: SSH i/o timeout during GitHub Actions deploy (2026-03-10)
**Symptom:** `dial tcp ***:***: i/o timeout` in deploy job
**Root Cause:** fail2ban on VPS bans GitHub Actions runner IPs after SSH auth failures. Runners use ephemeral IPs from hundreds of CIDR ranges.
**Fix:** Replaced SSH-only deploy with webhook-based deploy (primary) + SSH fallback + cron polling. See ADR-001.
**Prevention:** Webhook deploy eliminates SSH as primary mechanism.

## BUG-002: fail2ban banning legitimate SSH connections
**Symptom:** SSH connections refused after multiple failed attempts
**Root Cause:** Default fail2ban config too aggressive (3 retries, 10min ban)
**Fix:** Custom config: maxretry=5, findtime=600, bantime=3600 in `/etc/fail2ban/jail.d/sshd-custom.conf`
**Recovery:** Unban via Hostinger web console if locked out

## BUG-003: CRLF line endings breaking deploy scripts
**Symptom:** `/bin/bash^M: No such file or directory` on VPS
**Root Cause:** Windows Git checkout converts LF to CRLF
**Fix:** `.gitattributes` with `*.sh text eol=lf`

## BUG-004: Database auth mismatch
**Symptom:** App can't connect to PostgreSQL
**Root Cause:** Postgres uses default password `postiz-password`; DATABASE_URL in .env must match
**Fix:** Ensure DATABASE_URL uses `postiz-password` matching docker-compose.prod.yml DB_PASSWORD default

## BUG-005: Healthcheck timeout during deploy
**Symptom:** Deploy script reports app not responding after 300s
**Fix:** Increased timeout to 300s with HTTP fallback check after 60s (responds before Docker healthcheck passes)
