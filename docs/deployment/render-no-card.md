# Render Free + Aiven MySQL + Upstash Redis

DevFlow runs as one Render **Web Service** for this free demo. Express serves the compiled React application, API, Socket.IO, and optional BullMQ workers from the same process and origin.

## Before you begin

- Render Free can sleep after inactivity or restart; embedded jobs cannot run while it is asleep.
- Do not enable attachments: Render Free local files disappear on restart or redeploy.
- The initial migration is for a **new, empty Aiven MySQL database only**. Do not apply it to a database with existing DevFlow tables without reviewing its schema and migration history.
- Never put passwords, connection URLs, certificates, JWT secrets, or Redis URLs in Git.

## 1. Review and commit the initial Prisma migration

The repository uses Prisma `5.22.0`, MySQL, and this migration:

```text
prisma/migrations/20261011000000_init/migration.sql
prisma/migrations/20261011100000_add_email_verification_expiry/migration.sql
```

It was generated from `prisma/schema.prisma` against an empty schema. Review and commit it:

```powershell
Get-Content prisma/migrations/20261011000000_init/migration.sql
pnpm exec prisma validate --schema=prisma/schema.prisma
git add prisma/migrations
git commit -m "Add initial Prisma migration"
git push origin main
```

Do not run `pnpm db:push` or `pnpm db:migrate` against Aiven. `migrate dev` is a development command.

## 2. Create and prepare Aiven MySQL

1. Create an Aiven **MySQL** service and wait until it is running.
2. Create/select the empty `devflow` database and an application user with Aiven's documented migration privileges.
3. Download Aiven's CA certificate to a safe local folder outside this repository. Do not commit it.
4. Build the Prisma MySQL URL from Aiven's connection details. Percent-encode reserved characters in the username or password (`@`, `:`, `/`, `?`, `#`, `%`).
5. Add Prisma's strict TLS arguments:

```text
sslcert=/etc/secrets/aiven-ca.pem&sslaccept=strict
```

The finished URL belongs only in Render's `DATABASE_URL` setting. It must reference the Render secret-file path, not a Windows path.

### Apply the migration from your trusted Windows machine

Only do this after confirming the selected Aiven database is empty and after the migration is committed. The local migration command needs the CA's **local Windows path**; the later Render deployment uses `/etc/secrets/aiven-ca.pem` instead. This keeps the URL out of Git and PowerShell history:

```powershell
$secureDatabaseUrl = Read-Host "Paste the Aiven MySQL URL without TLS query parameters" -AsSecureString
$databaseUrl = [System.Net.NetworkCredential]::new('', $secureDatabaseUrl).Password
$caPath = "$env:USERPROFILE\.devflow\aiven-ca.pem"
$escapedCaPath = [uri]::EscapeDataString(($caPath -replace '\\', '/'))
$separator = if ($databaseUrl.Contains('?')) { '&' } else { '?' }
$env:DATABASE_URL = "$databaseUrl$separator" + "sslcert=$escapedCaPath&sslaccept=strict"
pnpm db:deploy
pnpm exec prisma migrate status --schema=prisma/schema.prisma
Remove-Item Env:DATABASE_URL
Remove-Variable secureDatabaseUrl,databaseUrl,caPath,escapedCaPath,separator
```

`pnpm db:deploy` runs `prisma migrate deploy --schema=./prisma/schema.prisma`. It does not generate a migration. Never apply it to an unknown or existing DevFlow database without a migration-history review.

## 3. Create Upstash Redis

1. Create a free Upstash Redis database.
2. In the **Connect** section's TCP tab, copy the TLS URL beginning with `rediss://`.
3. In Render, save it as `REDIS_URL`.

DevFlow passes this URL to ioredis. Do not set `REDIS_HOST`, `REDIS_PORT`, or `REDIS_PASSWORD` for this hosted configuration.

## 4. Create the Render Free Web Service

1. Push the committed repository to GitHub.
2. In Render, choose **New -> Web Service**, connect the repository, select branch `main`, and choose the **Free** instance type.
3. Render uses Node `22.22.0` from the committed `.node-version` file. Do not override it with a newer Node major version.
4. Use the repository root as the working directory and set:

```text
Build Command: npm install --global pnpm@8.15.9 && pnpm install --frozen-lockfile && pnpm render-build
Start Command: pnpm start:render
Health Check Path: /health/ready
```

Do **not** configure a Pre-Deploy Command. Render Free does not support it. Apply migrations manually in step 2 before deploying.

### Render environment variables

Copy variable names from `.env.render.example`; enter real values directly in Render:

```text
NODE_ENV
PORT
APP_URL
CORS_ORIGIN
DATABASE_URL
REDIS_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRES_IN
JWT_REFRESH_EXPIRES_IN
COOKIE_SECURE
COOKIE_SAME_SITE
RUN_WORKER_IN_API
EMAIL_PROVIDER
RESEND_API_KEY
EMAIL_FROM
ATTACHMENTS_ENABLED
AI_ENABLED
AI_PROVIDER
OPENAI_API_KEY
OPENAI_MODEL
```

Set `APP_URL` and `CORS_ORIGIN` to the public Render HTTPS URL. Set `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=lax`, `RUN_WORKER_IN_API=true`, `ATTACHMENTS_ENABLED=false`, and `AI_ENABLED=false`. Leave AI credentials absent unless intentionally enabling AI.

### Real email verification with Resend

DevFlow requires a new account to verify a six-digit, ten-minute email code before signing in. The default `console` provider only writes email jobs to worker logs. To send real mail, create and verify a sender in Resend, then set the following only in Render:

```text
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-resend-server-api-key
EMAIL_FROM=DevFlow <noreply@your-verified-domain.com>
```

Do not put these values in Git. With `RUN_WORKER_IN_API=true`, the embedded worker processes verification emails. Render Free may sleep, so delivery can be delayed until the service wakes.

### Aiven CA secret file

In Render, open the service's **Environment** settings, add a **Secret File**, upload Aiven's CA certificate, and set its path exactly to:

```text
/etc/secrets/aiven-ca.pem
```

Set `DATABASE_URL` with `sslcert=/etc/secrets/aiven-ca.pem&sslaccept=strict`. Do not use insecure certificate validation.

Do not set `VITE_API_URL` or `VITE_WS_URL`: React defaults to `/api/v1` and the current browser origin, keeping frontend, API, Socket.IO, and cookies same-origin.

## 5. Verify and troubleshoot

After Render deploys successfully:

```powershell
curl.exe --fail https://YOUR-SERVICE.onrender.com/health/live
curl.exe --fail https://YOUR-SERVICE.onrender.com/health/ready
```

Then register, sign in, create an organization/project/issue, and inspect Render logs. `/health/ready` returns `503` if MySQL or Redis is unavailable.

If startup fails, check:

1. `DATABASE_URL` is a MySQL URL with URL-encoded credentials and strict TLS arguments.
2. The Aiven CA has the exact secret-file path above.
3. `REDIS_URL` starts with `rediss://`.
4. JWT secrets are separate and at least 32 characters.
5. The initial migration was applied to the intended empty Aiven database.

## Backup precautions

Before changing schema or data, use Aiven's documented backup/export process. Render Free does not preserve uploaded files, so attachments remain disabled until an external object-storage provider is implemented.

For paid hosting or local development, use the dedicated worker:

```powershell
pnpm --filter @devflow/worker start
```
