# 1. Monorepo Architecture with PNPM Workspaces

Date: 2026-10-03
Status: Accepted

## Context
DevFlow comprises a web frontend, REST API service, worker node, database schemas, and shared utilities.

## Decision
We adopt a monorepo structure managed by `pnpm` workspaces (`apps/*` and `packages/*`).

## Consequences
- Shared validation schemas and TypeScript types compiled once and imported cleanly across API, Web, and Worker.
- Atomic commits and synchronized releases across backend and frontend codebases.
