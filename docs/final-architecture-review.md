# DevFlow final architecture review

Reviewed: 2026-10-10. This review covers the TypeScript monorepo, Prisma schema, HTTP and Socket.IO boundaries, worker, Docker/CI assets, and available automated checks. It is not a claim of 100% production readiness.

## Final architecture

DevFlow is a pnpm workspace with a React/Vite client (`apps/web`), Express/Socket.IO API (`apps/api`), BullMQ worker (`apps/worker`), Prisma/MySQL persistence, and Redis for cache, rate limits, and queues. Nginx is the public reverse proxy in Compose; MySQL, Redis, API, and worker are internal services. Attachments are stored through a provider abstraction, currently on a persistent local volume. AI is server-only and asynchronous.

## Major technical decisions

- Tenant and project scope are resolved server-side before protected handlers run.
- Access tokens are bearer tokens; refresh tokens are HTTP-only, rotated, hash-backed sessions.
- Dashboard aggregates execute in MySQL, rather than the browser.
- Cache keys include organization ID and a canonicalized filter object; mutations await invalidation.
- Long-running email, cleanup, notification, report, and AI work uses BullMQ queues.
- AI completion is assistance only; issue creation is independent of AI availability.

## Security model

Implemented: Zod validation, parameterized Prisma queries, Helmet, strict configured CORS, correlation IDs, role checks, request rate limiting, opaque attachment keys, and private attachment authorization. The review fixed three important defects: pino request logs now redact authorization/cookie headers; rate limit middleware is mounted; issue labels and assignees are validated against the current tenant/project.

The API refuses invalid query enums/pagination with validation errors. Project and organization middleware prevent direct-ID cross-tenant reads. Issue mutations now invalidate project cache entries whose issue counts can change.

## Data model summary

`User` has sessions, organization memberships, and project memberships. Organizations own projects, labels, notifications, and activity. Projects own issues with a per-project sequence. Issues have comments, labels, attachments, activities, and optional AI jobs. Composite unique/index definitions support membership checks, issue groupings, recent activity, and notification reads.

## Caching strategy

Redis caches read-heavy project lists/details. Cache keys are `organizationId` scoped and canonicalized so equivalent filter objects generate the same key. Project changes and issue mutations invalidate the organization’s project namespace. Cache errors fail open. Dashboard data is calculated in database queries and is not browser-derived.

## Background-job strategy

BullMQ queues are declared for email, notification, AI, reports, and cleanup with retry/backoff defaults. The worker processes email, AI, notification, and cleanup work and logs job failures. Production email configuration remains environment-driven; the development provider logs sends. HTTP flows persist their source-of-truth database changes before enqueueing follow-up work.

## Real-time strategy

Socket.IO authenticates the same bearer token used by HTTP. Private user rooms and organization/project/issue rooms are authorized against the database before join. This is suitable for one API instance; horizontal Socket.IO scaling still needs a Redis adapter.

## AI architecture

`AIProvider` isolates the provider implementation. The OpenAI-compatible provider runs only server-side, is optional, has request timeouts and structured fallback/error handling. AI jobs record request/result metadata and timing in `AIJob`. Browser code receives no provider key.

## Testing strategy

Implemented and run: Vitest unit/integration-style coverage for authentication, organization/project authorization, tenant isolation, health, cache behavior, Socket.IO room authorization, AI fallbacks, worker email behavior, and web issue-column behavior. The latest full run completed 29 API tests, 1 worker test, and 1 web test.

Optional/future: browser E2E coverage (registration through logout) is not yet configured; add Playwright with a disposable MySQL/Redis environment before treating E2E as release-gating.

## Deployment architecture

Compose defines web, API, worker, MySQL, and Redis. Nginx is the only published service. Health checks, restart policies, internal networking, named MySQL/Redis/attachment volumes, and environment-driven secrets are configured. GitHub Actions verifies PRs; a main-branch deployment workflow is gated by GitHub environment secrets.

## Remaining findings and concrete fixes

| Severity | Affected area | Why it matters | Concrete next fix |
|---|---|---|---|
| High | `prisma/` | There is no committed Prisma migration history; `db push` is not a safe production rollout mechanism. | Create/review an initial migration, commit it, and change deployment to `prisma migrate deploy`. |
| High | `docker/nginx.conf`, deployment environment | Nginx does not terminate TLS itself; secure refresh cookies require HTTPS. | Put TLS termination/cert rotation at the ingress or add managed certificates before public deployment. |
| High | E2E test coverage | Core browser flows are not executed end to end in CI. | Add Playwright registration/login/org/project/issue/comment/assignment/logout tests. |
| Medium | `apps/api/src/realtime/socket.ts` | Socket.IO has no Redis adapter, so events/rooms do not span API replicas. | Add the Socket.IO Redis adapter and an integration test with two API instances. |
| Medium | attachment upload middleware/provider | MIME type originates from the request and is not content-sniffed. | Inspect magic bytes with an allow-listed detector and consider malware scanning for production. |
| Medium | worker queues | Report queue is declared but has no processor; notification processing is only partially asynchronous. | Implement the report processor and use an outbox pattern for durable notification enqueueing. |
| Medium | `.github/workflows/deploy.yml` | Deployment action version is tag-based and deployment requires repository variables/secrets to be configured. | Pin actions to commit SHAs and document/configure required protected-environment variables. |
| Low | `apps/api/src/services/ai/ai.service.ts` | Older synchronous AI convenience methods duplicate the queued workflow. | Deprecate or remove them after consumers exclusively use queued AI jobs. |
| Low | test/seed lint warnings | Lint has zero errors but 18 warnings remain, chiefly demo `console` output and unused fixtures. | Clean warnings once seed output is moved to a CLI logger and unused test fixtures are removed. |

## Known limitations

- Docker was reviewed statically here; Docker CLI was unavailable on the review machine, so Compose was not run locally.
- E2E infrastructure is absent, so it could not be executed.
- The report/email/notification queue coverage is not uniform yet.
- Production operation still requires TLS, committed migrations, a secret manager, backups, monitoring/alerting, and a multi-instance Socket.IO plan.

## Future improvements

Prioritize committed migrations, TLS, Playwright E2E, an outbox pattern, Redis Socket.IO adapter, upload content inspection, OpenTelemetry/metrics, backup/restore drills, and dependency/security scanning in CI.
