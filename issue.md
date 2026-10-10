# DevFlow QA issue register

**Review date:** 10 October 2026  
**Role:** Senior QA review  
**Scope:** Local API health check, source/API route review, database schema review, and frontend workflow inspection.  
**Important test limitation:** `http://127.0.0.1:4000/health/live` returned **200**. The web server on `http://127.0.0.1:5173` was not running during this review, and no controllable browser surface was available in the QA environment. Browser click-through scenarios therefore need a second pass once Vite is running. Findings marked **Confirmed by source/API** do not depend on that limitation.

## Remediation update

The following findings have been implemented in source and require browser/API regression testing: **QA-F-001** (hashed invitation token, accept route/page, queued invitation link), **QA-F-002/F-003** (assignee and core issue editing controls), **QA-F-004** (organization settings screen), **QA-F-005** (project-owner removal guard), **QA-F-006/F-007** (Cancelled column and request error handling), **QA-S-001** (content-signature attachment validation), **QA-S-003** (authentication rate-limit fail-closed behavior), **QA-S-004** (hashed invitation tokens), and **QA-D-002/D-004** (atomic issue update predicate and board-query index in Prisma schema). **QA-D-001** remains open until a reviewed baseline migration is committed and deployed.

## QA status summary

| Area | Result | Notes |
|---|---|---|
| API health | Pass | `/health/live` returned HTTP 200. |
| Web availability | Blocked | Port 5173 was not listening during the review. |
| Typecheck/build from previous verification | Pass | Last recorded web typecheck and production build passed. |
| Automated API tests | Pass, incomplete | Existing tests cover selected auth/RBAC/isolation cases but not the end-to-end product journey. |
| Browser E2E | Not available | No Playwright/Cypress suite is configured. |
| Database migration readiness | Fail | No committed Prisma migration history was found. |

## Critical and high-priority functional defects

### QA-F-001 — Organization invitations cannot be accepted

- **Severity:** Critical
- **Status:** Confirmed by source/API
- **Affected files:** `apps/api/src/routes/organization.routes.ts`, `apps/api/src/services/organization.service.ts`, `apps/web/src/pages/OrgMembersPage.tsx`
- **Observed behavior:** An admin can create an invitation at `POST /organizations/:organizationId/invitations`, but there is no accept/decline route, controller, service method, or client page. The token is generated and stored, but is never consumed.
- **User impact:** A newly invited colleague can never join the organization through DevFlow. Consequently, they cannot be added to a project or assigned an issue.
- **Expected behavior:** An authenticated recipient can open an invitation URL, review the organization/role, accept or decline it, and receive an `OrganizationMember` record. Expired, used, and wrong-email invitations must be rejected.
- **Recommended fix:** Implement `GET/POST /invitations/:token` (or equivalent), token hashing, expiry/status validation, transactionally create membership + update invitation status, and add an invitation acceptance screen and E2E test.

### QA-F-002 — Issue assignment is not available in the user interface

- **Severity:** High
- **Status:** Confirmed by source/UI
- **Affected files:** `apps/web/src/pages/IssueBoardPage.tsx`, `apps/api/src/services/issue.service.ts`
- **Observed behavior:** The API accepts `assigneeId` for issue create/update and creates assignment notifications. The issue board provides only title creation, status movement, comments, and attachments; it has no assignee picker.
- **User impact:** A project lead/member cannot assign a task through the product UI, despite assignment being a core advertised workflow.
- **Expected behavior:** The issue create/edit experience should list eligible project members, allow assign/unassign, show current assignee, and refresh notification/activity feedback.
- **Recommended fix:** Add an issue detail/edit form with an assignee selector populated from `GET /projects/:projectId/members`; call the existing PATCH endpoint and add UI/API tests.

### QA-F-003 — Issue editing is incomplete

- **Severity:** High
- **Status:** Confirmed by source/UI
- **Affected files:** `apps/web/src/pages/IssueBoardPage.tsx`, `packages/validation/src/schemas/issue.ts`
- **Observed behavior:** The backend supports updates to title, description, type, priority, status, due date, labels, and assignee. The UI exposes only status movement. It also does not display or edit labels, priority, type, or due date.
- **User impact:** Users cannot maintain a reported issue properly after creation.
- **Recommended fix:** Build an edit drawer/modal or issue detail page, use the existing version value for optimistic updates, and add field-level validation/error states.

### QA-F-004 — Organization “Settings” is not actual organization settings

- **Severity:** High
- **Status:** Confirmed by source/UI
- **Affected files:** `apps/web/src/pages/OrganizationsPage.tsx`, `apps/web/src/pages/OrgMembersPage.tsx`, `apps/api/src/routes/organization.routes.ts`
- **Observed behavior:** The organization API exposes `PATCH /organizations/:organizationId` for name/slug/logo updates. The UI previously linked to a nonexistent `/settings` route; it now links to the member-management page and is labelled “Members & Settings”, but no screen allows editing organization name, slug, or logo.
- **User impact:** Owners/admins cannot use the actual organization settings feature in the UI.
- **Recommended fix:** Add a dedicated organization settings section/page with read-only/viewer state, name/slug/logo form, conflict handling for slug, and route it separately from membership management.

### QA-F-005 — A project lead can remove the project owner from membership

- **Severity:** High
- **Status:** Confirmed by source/API
- **Affected files:** `apps/api/src/services/project.service.ts`, `apps/api/src/repositories/project.repository.ts`, `apps/web/src/pages/ProjectDetailsPage.tsx`
- **Observed behavior:** `removeProjectMember` verifies only that the target belongs to the project. It does not prevent removal of `Project.ownerId`. The new UI intentionally hides the remove action for the owner, but another lead can still call the API directly.
- **User impact:** The project owner can lose project access, particularly if they are not an organization owner/admin with implicit access.
- **Recommended fix:** Reject removal of the project owner, or require an explicit, audited ownership-transfer operation before removal. Add an authorization test for a second project lead.

### QA-F-006 — Cancelled issues disappear from the board

- **Severity:** Medium
- **Status:** Confirmed by source/UI
- **Affected files:** `apps/web/src/lib/issueBoard.ts`, `apps/web/src/pages/IssueBoardPage.tsx`, `packages/shared/src/types/enums.ts`
- **Observed behavior:** The API supports `CANCELLED`, but the board has columns only for BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, and DONE. An issue set to CANCELLED through the API is not shown in any board column.
- **User impact:** Users can believe a cancelled issue was deleted or lost.
- **Recommended fix:** Add a Cancelled column or an explicit archived/cancelled filter.

### QA-F-007 — Issue detail/comment requests have no failure handling

- **Severity:** Medium
- **Status:** Confirmed by source/UI
- **Affected files:** `apps/web/src/pages/IssueBoardPage.tsx`
- **Observed behavior:** `open()` and `addComment()` await API calls without `try/catch`; failed calls produce unhandled promise rejections and no usable feedback.
- **User impact:** On a transient network/API error, users receive no clear error and may retry blindly.
- **Recommended fix:** Add loading, disabled-submit, and error handling states; preserve typed comment text after failure.

## UI/UX defects and gaps

### QA-U-001 — Web application was unavailable for the local QA run

- **Severity:** High (environment/release blocker)
- **Status:** Observed locally
- **Affected area:** Local developer startup / port `5173`
- **Observed behavior:** API health passed, but the web server did not accept connections on port 5173. A normal Vite start attempt did not produce a listening server in this QA environment.
- **User impact:** The client cannot exercise any workflow if the frontend is not running.
- **Recommended fix:** Run `pnpm --filter @devflow/web dev --host 127.0.0.1`, inspect startup output, and add a documented preflight/health command. Re-run the browser suite after it is available.

### QA-U-002 — Project-membership controls are not proven in the live UI

- **Severity:** Medium
- **Status:** Needs browser retest
- **Affected files:** `apps/web/src/pages/ProjectDetailsPage.tsx`
- **Observed behavior:** Source now contains an “Add organization member to this project” selector for leads. It could not be clicked through because the web server was unavailable.
- **Risk:** API contract/response-shape mismatch or stale browser bundle could leave the control empty or non-functional.
- **Recommended fix:** Retest as a lead with at least one organization member who is not already on the project; verify add, duplicate-member error, viewer/lead role choice, and remove behavior.

### QA-U-003 — No visible invitation lifecycle management

- **Severity:** Medium
- **Status:** Confirmed by source/UI
- **Affected files:** `apps/web/src/pages/OrgMembersPage.tsx`
- **Observed behavior:** The page lets an admin send an invitation but does not show pending invitations, expiry, resend, cancel, or acceptance status—even though a list-invitations API exists.
- **Recommended fix:** Add a pending-invitations table with email, role, expiry, status, resend/cancel actions, and a clear distinction between pending invitations and active members.

### QA-U-004 — Large initial JavaScript bundle

- **Severity:** Low (performance)
- **Status:** Observed in production build
- **Affected area:** `apps/web`
- **Observed behavior:** The production Vite build reports an approximately 809 kB minified initial JavaScript chunk (about 233 kB gzip), exceeding Vite’s 500 kB warning threshold.
- **User impact:** Slower first load on mobile or slower networks.
- **Recommended fix:** Route-level lazy loading for dashboard/activity/issue board and split chart/AI/attachment dependencies into async chunks.

## Security findings

### QA-S-001 — Attachment validation trusts the client-provided MIME type

- **Severity:** High
- **Status:** Confirmed by source/API
- **Affected files:** `apps/api/src/middleware/upload.ts`, `apps/api/src/services/attachment.service.ts`
- **Observed behavior:** Upload validation uses `file.mimetype` and file extension. Both can be forged by a client; file contents are not inspected.
- **Impact:** A dangerous payload can be stored with an allowed extension/MIME declaration. Risk increases if files are later served inline or scanned by other tools.
- **Recommended fix:** Inspect magic bytes with an allow-listing library, force download/content-disposition for untrusted files, add malware scanning for production, and test spoofed MIME/extension cases.

### QA-S-002 — Development JWT fallback secrets are hard-coded

- **Severity:** Medium
- **Status:** Confirmed by source/API
- **Affected file:** `apps/api/src/config/env.ts`
- **Observed behavior:** If JWT secrets are missing outside production, predictable fallback secrets are used.
- **Impact:** A mistakenly exposed development environment can accept tokens signed with publicly known keys.
- **Recommended fix:** Require explicit secrets in all non-test environments, or generate ephemeral secrets only for test mode. Keep development startup guidance in `.env.example`.

### QA-S-003 — Rate limiting fails open when Redis is unavailable

- **Severity:** Medium
- **Status:** Confirmed by source/API
- **Affected file:** `apps/api/src/middleware/rateLimiter.ts`
- **Observed behavior:** Redis failures call `next()` and allow requests through without a fallback limiter.
- **Impact:** Brute-force protection disappears during a Redis outage.
- **Recommended fix:** For authentication endpoints, fail closed with a controlled 503 or use a small in-memory emergency limiter; alert on Redis failures.

### QA-S-004 — Invitation tokens are stored in plaintext

- **Severity:** Medium
- **Status:** Confirmed by source/schema
- **Affected files:** `prisma/schema.prisma`, `apps/api/src/services/organization.service.ts`
- **Observed behavior:** `OrganizationInvitation.token` is stored and indexed as plaintext.
- **Impact:** A database read exposes bearer-style invitation credentials.
- **Recommended fix:** Store a SHA-256/HMAC token hash, compare hashes on acceptance, and only send the raw token in the invitation URL.

### QA-S-005 — No demonstrated CSRF strategy for cookie-based refresh/logout endpoints

- **Severity:** Low/Medium
- **Status:** Needs targeted browser/security test
- **Affected files:** auth controller/routes, cookie configuration
- **Observed behavior:** Refresh tokens are cookies while access tokens are bearer tokens. No explicit CSRF-token mechanism was identified in this review.
- **Impact:** Depends on cookie `SameSite`, deployed origin, and endpoint side effects; should be verified before internet exposure.
- **Recommended fix:** Document the chosen SameSite policy, verify it in a browser test, and add CSRF protection if cross-site cookie behavior is permitted.

## Database and data-integrity findings

### QA-D-001 — No committed Prisma migrations

- **Severity:** High
- **Status:** Confirmed by repository inspection
- **Affected area:** `prisma/`
- **Observed behavior:** Schema/seed files exist, but no migration history was found. Documentation refers to `db push` for local setup.
- **Impact:** Production schema changes are not traceable, reviewable, or reliably deployable.
- **Recommended fix:** Generate and commit an initial migration, require reviewed migrations for all changes, and deploy with `prisma migrate deploy`.

### QA-D-002 — Optimistic locking is not atomic

- **Severity:** High
- **Status:** Confirmed by source/API
- **Affected file:** `apps/api/src/services/issue.service.ts`
- **Observed behavior:** Update reads the issue/version, compares in application code, then calls `prisma.issue.update({ where: { id } })`. The version is not included in the update predicate.
- **Impact:** Two concurrent clients can both read version N, both pass validation, and both write; one update is silently overwritten despite the advertised optimistic-concurrency feature.
- **Recommended fix:** Use `updateMany` with `where: { id, projectId, version: expectedVersion }` and increment version in the same statement/transaction. Treat zero affected rows as a 409 conflict. Add a concurrency integration test.

### QA-D-003 — Attachment deletion can leave database metadata pointing to a missing file

- **Severity:** Medium
- **Status:** Confirmed by source/API
- **Affected file:** `apps/api/src/services/attachment.service.ts`
- **Observed behavior:** Deletion removes the storage object first and database row second. If the database delete fails after storage deletion, metadata remains but download fails.
- **Impact:** Inconsistent attachment records and user-visible download failures.
- **Recommended fix:** Use a deletion state/outbox job, or delete DB metadata transactionally then perform retriable storage cleanup. Record/monitor cleanup failures.

### QA-D-004 — Missing composite index for the dominant issue-board query

- **Severity:** Medium (performance)
- **Status:** Confirmed by schema/query review
- **Affected files:** `prisma/schema.prisma`, `apps/api/src/services/issue.service.ts`
- **Observed behavior:** The board list filters by `projectId` and `deletedAt`, then sorts by `updatedAt` (or another selected sort field). Existing indexes cover separate fields and selected pairs, not the common `projectId + deletedAt + updatedAt` access path.
- **Impact:** Issue-board latency can grow unnecessarily with a large project.
- **Recommended fix:** Verify with `EXPLAIN ANALYZE` on production-like data; likely add `@@index([projectId, deletedAt, updatedAt])`, then measure before/after.

## Test cases that must be run after the web server is restored

1. Register a new user; verify validation, duplicate-email handling, login, refresh, and logout.
2. Create organization; edit name/slug; confirm Settings route and saved values.
3. Invite a user; accept/decline invitation; verify expiry and duplicate invitation behavior.
4. Add accepted organization member to a project as Viewer, Member, and Lead.
5. Attempt to remove project owner as a second lead; verify it is forbidden after fix.
6. Create an issue; assign/unassign it; edit all fields; move it to Cancelled; verify it remains visible.
7. Test concurrent issue update using two browser sessions; verify one receives a 409.
8. Upload valid file, oversize file, forged MIME/extension file, and cross-tenant attachment URL.
9. Test viewer/member/lead permissions for all issue/project actions.
10. Run cross-organization direct-ID attempts for project, issue, activity, attachment, AI job, and Socket.IO rooms.

## Positive controls observed

- API liveness endpoint responds successfully.
- API routes consistently use authentication and organization/project middleware for protected operations.
- Issue relation validation rejects labels and assignees that do not belong to the appropriate tenant/project.
- Redis cache keys are tenant-scoped and cache invalidation is awaited.
- Attachment storage paths include organization/project/issue boundaries and are not direct public file paths.

