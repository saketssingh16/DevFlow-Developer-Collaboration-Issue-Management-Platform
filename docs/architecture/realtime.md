# DevFlow Real-Time Synchronization Architecture

## Engine
DevFlow uses Socket.IO with a Redis adapter for scale-out support across API instances.

## Room Hierarchy & Scope
* `org:{organizationId}`: Tenant-wide notifications and announcements.
* `project:{projectId}`: Real-time board movements, issue additions, project activity.
* `issue:{issueId}`: Granular issue live view, typing indicators, comment feed updates.

## Guarantee
Socket events provide live UI updates, but the MySQL database is always the source of truth. Frontend clients invalidate TanStack Query caches on real-time event signals.
