# Production Secrets

Store local production secret files here only for private deployments. The
actual secret files are ignored by Git.

Expected filenames for `docker-compose.prod.yml`:

- `backend_internal_api_key`
- `database_url`
- `nextauth_secret`
- `postgres_password`
- `redis_password`
- `redis_url`
- `seed_sys_admin_password`

Example value formats:

```text
database_url: postgresql://nextjs_md_app:<postgres-password>@postgres:5432/nextjs_md_project
redis_url: redis://:<redis-password>@redis:6379
```
