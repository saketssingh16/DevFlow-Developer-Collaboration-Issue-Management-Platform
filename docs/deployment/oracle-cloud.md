# Oracle Cloud Always Free deployment

This guide deploys DevFlow on one Ubuntu 24.04 ARM64 VM using the repository’s Docker Compose stack. It does not expose MySQL, Redis, the API, or the worker directly; only Nginx publishes ports 80 and 443.

## Prerequisites

- Oracle Cloud Always Free Ubuntu 24.04 ARM64 VM with a public IPv4 address.
- A DNS `A` record such as `devflow.example.com` pointed to that address.
- Oracle Security List/Network Security Group and Ubuntu firewall rules allowing inbound TCP 80 and 443 only.
- Docker Engine and Compose plugin installed on the VM.

Install Docker on Ubuntu using Docker’s official repository, then verify:

```sh
docker --version
docker compose version
```

The repository images use official multi-architecture Node, Nginx, MySQL 8, and Redis 7 images. Compose pins services to `linux/arm64`, matching the Oracle ARM VM.

## Obtain and configure the application

```sh
git clone <YOUR_REPOSITORY_URL> devflow
cd devflow
cp .env.production.example .env
chmod 600 .env
mkdir -p docker/certs backups/mysql backups/uploads
```

Edit `.env` and set a real domain, unique MySQL passwords, and two independent JWT secrets. Generate secrets locally on the VM with:

```sh
openssl rand -base64 48
```

Keep `AI_ENABLED=false` unless an intentional server-side AI configuration and budget are in place.

## HTTPS certificate

Nginx requires these files before the web container starts:

```text
docker/certs/fullchain.pem
docker/certs/privkey.pem
```

Use your preferred certificate authority. If using Certbot, obtain a certificate for the configured domain, then copy or symlink its full chain and private key into `docker/certs/` with permissions that allow Docker to read them. Renew the certificate on the host and run:

```sh
docker compose exec web nginx -s reload
```

Do not run public production traffic over HTTP only: production refresh cookies are marked `Secure` and require HTTPS.

## Build, migrate, and start

First validate the rendered Compose model:

```sh
docker compose config
```

Build ARM64 containers:

```sh
docker compose build
```

Run database migrations as an explicit one-time deployment step, never `prisma db push`:

```sh
docker compose --profile migration run --rm migrate
```

Then start the long-running services:

```sh
docker compose up -d mysql redis api worker web
docker compose ps
```

Verify only the web proxy has published ports:

```sh
docker compose ps
curl --fail https://devflow.example.com/api/v1/health/ready
```

## Logs and updates

```sh
docker compose logs -f api worker web
git pull --ff-only
docker compose build
docker compose --profile migration run --rm migrate
docker compose up -d --remove-orphans
docker compose ps
```

## Backups and recovery

MySQL and uploaded files are named Docker volumes (`mysql_data`, `attachment_data`) and survive normal container replacement. Create backups from the VM:

```sh
docker compose exec -T mysql sh -c 'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' > backups/mysql/devflow-$(date +%F).sql
docker run --rm -v devflow_attachment_data:/data -v "$PWD/backups/uploads:/backup" alpine tar czf /backup/uploads-$(date +%F).tgz -C /data .
```

To restore after stopping API/worker writes:

```sh
docker compose exec -T mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < backups/mysql/<backup>.sql
docker run --rm -v devflow_attachment_data:/data -v "$PWD/backups/uploads:/backup" alpine sh -c 'rm -rf /data/* && tar xzf /backup/<backup>.tgz -C /data'
docker compose up -d api worker web
```

Store encrypted backup copies outside the VM. Redis uses AOF persistence (`appendfsync everysec`) to preserve queue/cache state across normal restarts, but MySQL remains the system of record.

## Migration requirement

`migrate` runs `prisma migrate deploy` through the explicit Compose profile. This repository must contain committed Prisma migration files before a first production deployment. Do not use `db push` on the VM. If the current local XAMPP database was created with `db push`, baseline it deliberately in a separate change before using this guide against production data.

## Remaining operational limitations

- Oracle capacity and its Always Free allowance depend on tenancy/region; public IP and outbound bandwidth limits can apply.
- This single-VM design has no high availability. VM failure affects API, worker, MySQL, Redis, and uploads together.
- Local-volume uploads need the backup procedure above; object storage/S3 is a future scalability option.
- Email delivery and AI require separately configured providers and may incur costs.
