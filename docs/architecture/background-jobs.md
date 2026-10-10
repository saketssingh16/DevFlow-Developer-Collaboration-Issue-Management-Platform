# DevFlow Background Processing Architecture

## Framework
DevFlow uses BullMQ backed by Redis for durable, asynchronous job queues processed by `apps/worker`.

## Queues
1. **email**: Handles transactional registration, email verification, password reset, and invitation emails.
2. **notification**: Processes in-app notifications and fan-out to affected team members.
3. **ai**: Executes background AI tasks (issue summarization, duplicate detection).
4. **cleanup**: Performs scheduled maintenance (expired session purging, unattached file cleanup).
