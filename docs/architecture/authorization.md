# DevFlow Authorization & RBAC Architecture

DevFlow implements a strict multi-tenant Role-Based Access Control (RBAC) hierarchy.

## 1. Multi-Tenant Boundary Enforcement
* **Tenant Isolation**: Organizations serve as absolute data boundaries. Every repository operation filters explicitly by `organizationId`.
* **Zero Client Trust**: Frontend-supplied `organizationId` or permission parameters are NEVER trusted. The server verifies membership and role authorization for every request via server-side middlewares (`requireOrganizationMember` & `requireOrganizationRole`).

## 2. Role Matrix & Hierarchy

### Organization Roles (`OrgRole`)

| Role | Hierarchy Weight | Capabilities & Operation Rules |
| :--- | :--- | :--- |
| **OWNER** | 5 | Full organization control, soft-deleting organization, transferring ownership, changing member roles, managing all members and projects. Cannot remove the last owner. |
| **ADMIN** | 4 | Member invitations, member removal (except owners), updating organization settings (name/slug), creating projects. |
| **MANAGER** | 3 | Managing project workflows, assigning team members, creating and managing issues. |
| **DEVELOPER** | 2 | Creating issues, updating issue details, commenting, uploading attachments. |
| **VIEWER** | 1 | Read-only access to organization details, member list, projects, and issues. Cannot perform any mutations. |

## 3. Server Authorization Middleware Architecture

```
HTTP Request
     │
     ▼
requireAuthenticatedUser()       ──► Verifies JWT Bearer Token signature & payload
     │
     ▼
requireOrganizationMember(param) ──► Queries DB to confirm user is active member of tenant
     │
     ▼
requireOrganizationRole(minRole) ──► Asserts user role hierarchy weight >= minRole weight
     │
     ▼
Controller & Service Handler
```
