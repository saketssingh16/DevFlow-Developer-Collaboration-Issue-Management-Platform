# DevFlow System Overview Architecture

DevFlow is a multi-tenant developer collaboration and issue management platform designed for speed, security, and scalability.

## 1. High-Level Architecture

```
+-------------------------------------------------------------------+
|                           Web App Client                          |
|         (React 18 + TS + Vite + TanStack Query + Socket.IO)       |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                        Nginx Reverse Proxy                        |
+-------------------------------------------------------------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
+-----------------------+                   +-----------------------+
|     API Service       |                   |    Worker Service     |
| (Express + Socket.IO) |                   |  (BullMQ Processor)   |
+-----------------------+                   +-----------------------+
    |         |        \                         /        |
    |         |         +--------+     +--------+         |
    v         v                  v     v                  v
+-------+  +-------+          +-----------+          +---------+
| MySQL |  | Redis |          |  BullMQ   |          | Storage |
| (Data)|  | Cache |          |  Queues   |          |  (S3)   |
+-------+  +-------+          +-----------+          +---------+
```

## 2. Core Architectural Principles
* **Multi-Tenancy**: Complete organization isolation at query and authorization level.
* **Optimistic Concurrency**: Version-protected mutations preventing silent overwrites.
* **Decoupled Background Tasks**: Immediate API responses with async worker processing via BullMQ.
* **Real-time Synchronization**: Websocket rooms scoped to tenants, projects, and issues.
* **Provider-agnostic AI**: Modular AI interface for issue summaries and deduplication.
