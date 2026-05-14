# nextjs-md-project

Model operations dashboard built with Next.js App Router, opaque Redis sessions, Prisma,
PostgreSQL, and Redis.

## Requirements

- Node.js
- PostgreSQL
- Redis

## Environment

Copy the example environment file and replace the placeholder values. Do not
commit real secrets.

```bash
cp .env.example .env
```

For production, `NEXTAUTH_URL` must use `https://` unless it points to a local
development hostname.

Set `TRUST_PROXY_HEADERS=true` only when the app runs behind infrastructure that
strips or overwrites client-supplied forwarding headers such as
`x-forwarded-for`. This keeps login rate limiting and audit IPs from trusting
spoofed request headers on direct deployments.

For production secrets, prefer Docker secrets or a platform secret manager
instead of committing or baking `.env` values into an image. Server-side runtime
code supports the Docker/Kubernetes-style `_FILE` convention for these values:

```bash
DATABASE_URL_FILE="/run/secrets/database_url"
REDIS_URL_FILE="/run/secrets/redis_url"
BACKEND_INTERNAL_API_KEY_FILE="/run/secrets/backend_internal_api_key"
SEED_SYS_ADMIN_PASSWORD_FILE="/run/secrets/seed_sys_admin_password"
```

Do not set both `NAME` and `NAME_FILE`.

Set `SEED_SYS_ADMIN_PASSWORD` before running the seed script. Use a strong
temporary password and change it after first login.

## Setup

```bash
npm install
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

The seed script creates or resets the initial `sys_admin` account using
`SEED_SYS_ADMIN_PASSWORD` and creates the default session idle timeout setting.
Change the seeded password before using the app beyond local development.

## Phase 2 NestJS Backend

The app can keep its existing authenticated Next.js BFF route while delegating
migrated backend work to NestJS.

Start the NestJS backend:

```bash
npm run backend:start
```

By default it listens on `http://localhost:4000` and exposes:

- `GET /api/health`
- `GET /api/admin/settings/session`
- `PATCH /api/admin/settings/session`

Set these values when you want the Next.js route to call NestJS instead of the
local fallback:

```bash
BACKEND_API_URL="http://localhost:4000"
BACKEND_INTERNAL_API_KEY="replace-with-a-long-random-internal-api-key"
```

For local Phase 2 infrastructure using the same Postgres/Redis images:

```bash
docker compose -f docker-compose.phase2.yml up -d
npx prisma migrate deploy
```

## Production Docker

Production uses separate containers for the Next.js frontend, NestJS backend,
PostgreSQL, Redis, and migrations. Only the frontend publishes a host port.
Backend, Postgres, and Redis stay on the private Compose network.

Create these secret files before starting production:

```text
secrets/backend_internal_api_key
secrets/database_url
secrets/postgres_password
secrets/redis_password
secrets/redis_url
```

Example secret value formats:

```text
database_url: postgresql://nextjs_md_app:<postgres-password>@postgres:5432/nextjs_md_project
redis_url: redis://:<redis-password>@redis:6379
```

Start production:

```bash
NEXTAUTH_URL="https://your-domain.example" docker compose -f docker-compose.prod.yml up -d --build
```

Run the initial `sys_admin` seed only when needed:

```bash
NEXTAUTH_URL="https://your-domain.example" docker compose -f docker-compose.prod.yml --profile seed run --rm seed
```

The seed command requires `secrets/seed_sys_admin_password`. Do not keep that
file on the server longer than needed after the initial bootstrap.

## Scripts

```bash
npm run dev
npm run backend:start
npm run backend:build
npm run backend:start:prod
npm run build
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Security Baseline

- Passwords are hashed with Argon2id.
- Prisma ORM is used for database access.
- Login attempts and idle session activity use Redis.
- Protected pages require a valid session.
- Admin pages require the `ADMIN` role.
- Security headers are configured in `next.config.ts`, including CSP,
  clickjacking protection, content-type sniffing protection, referrer policy,
  permissions policy, and production HSTS.
- Secure session cookies are enabled automatically when `NEXTAUTH_URL` uses
  HTTPS.
