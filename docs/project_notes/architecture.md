# Postiz Architecture

## Overview
Postiz is a self-hosted social media scheduling tool. Fork of gitroomhq/postiz-app, customized for One Group.

## Tech Stack
| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 22.12.0 |
| Package Manager | pnpm | 10.6.1 |
| Backend | NestJS | 10.x |
| Frontend | React + Vite | 18.x + 6.x |
| Database | PostgreSQL | 17-alpine |
| Cache | Redis | 7.2 |
| Job Queue | Temporal | 1.28.1 |
| Search | Elasticsearch | 7.17.27 |
| ORM | Prisma | 6.x |
| Process Manager | PM2 | latest |
| Reverse Proxy | Nginx | latest |

## Monorepo Structure
- `apps/backend/` - NestJS REST API (Controller >> Service >> Repository pattern)
- `apps/frontend/` - Vite + React UI
- `apps/orchestrator/` - Temporal background jobs/workflows
- `apps/cli/` - CLI tool
- `apps/commands/` - Utility commands
- `apps/extension/` - Browser extension
- `apps/sdk/` - Published Node SDK
- `libraries/helpers/` - Shared utilities
- `libraries/nestjs-libraries/` - NestJS services, Prisma schema
- `libraries/react-shared-libraries/` - React components & hooks

## Key Patterns
- Backend: Controller >> Service >> Repository (sometimes Controller >> Manager >> Service >> Repository)
- Frontend: SWR for data fetching via `useFetch` hook
- Each SWR hook must be in a separate hook function (react-hooks/rules-of-hooks)
- Native components only (no npm UI libraries)
- Tailwind 3 for styling (check colors.scss, global.scss, tailwind.config.js)
