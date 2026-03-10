# Architectural Decisions

## ADR-001: Webhook-Based Deployment (2026-03-10)
**Status:** Accepted
**Context:** GitHub Actions SSH deploy fails intermittently due to fail2ban banning ephemeral GitHub runner IPs. IP whitelisting is impractical (hundreds of CIDR ranges that change).
**Decision:** Replace SSH-based deploy with 3-layer approach: webhook (primary) + SSH fallback + cron polling safety net.
**Consequences:** Requires port 9443 open on VPS, webhook secret management, Python3 on VPS (already available on Debian).

## ADR-002: Fork from gitroomhq/postiz-app
**Status:** Accepted
**Context:** Need custom branding (One Group logo) and deployment configuration.
**Decision:** Maintain fork at github.com/1OneGroup/postiz-app with custom Dockerfile.dev and deployment scripts.

## ADR-003: LF Line Endings for Shell Scripts
**Status:** Accepted
**Context:** Windows CRLF line endings break bash scripts on Linux VPS.
**Decision:** `.gitattributes` with `*.sh text eol=lf` forces LF on all shell scripts.
