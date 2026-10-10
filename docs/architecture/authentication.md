# DevFlow Authentication Architecture

## Overview
DevFlow uses a stateless, short-lived Access Token (JWT) combined with a stateful, HTTP-Only Refresh Token Cookie with automatic token rotation.

## Token Lifecycle

1. **Access Token**:
   - Expiry: 15 minutes
   - Storage: Application memory only (never localStorage or sessionStorage)
   - Header: `Authorization: Bearer <access_token>`

2. **Refresh Token**:
   - Expiry: 7 days
   - Storage: `__Host-refresh_token` HTTP-only, Secure, SameSite=Strict cookie
   - Persistence: Hashed with Argon2 and stored in the `Session` table in MySQL
   - Rotation: Replaced on every refresh operation; previous token invalidated immediately.

3. **Session Management**:
   - Individual session revoking (`DELETE /api/v1/auth/sessions/:sessionId`)
   - Global session revoking (`POST /api/v1/auth/logout-all`)
