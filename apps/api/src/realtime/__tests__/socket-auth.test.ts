import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer, Server as HttpServer } from 'node:http';
import { io as ClientIO } from 'socket.io-client';
import { initializeSocketIO } from '../socket.js';
import { generateAccessToken } from '../../utils/token.js';
import { prisma } from '../../config/database.js';

describe('Socket.IO Real-Time Authentication & Room Authorization Tests', () => {
  let httpServer: HttpServer;
  let port: number;
  const userA = { userId: 'user-socket-A', email: 'userA@socket.com' };
  const validToken = generateAccessToken(userA);

  beforeAll((done) => {
    httpServer = createServer();
    initializeSocketIO(httpServer);
    httpServer.listen(0, () => {
      port = httpServer.address().port;
      done();
    });
  });

  afterAll((done) => {
    httpServer.close(done);
  });

  it('rejects connection when token is missing', (done) => {
    const client = ClientIO(`http://127.0.0.1:${port}`, {
      transports: ['polling'],
      autoConnect: true,
      reconnection: false
    });

    client.once('connect_error', (err) => {
      expect(err.message).toContain('Authentication token required');
      client.close();
      done();
    });
  });

  it('connects successfully when valid JWT token is provided', (done) => {
    const client = ClientIO(`http://127.0.0.1:${port}`, {
      auth: { token: validToken },
      transports: ['websocket'],
      reconnection: false
    });

    client.on('connect', () => {
      expect(client.connected).toBe(true);
      client.close();
      done();
    });
  });

  it('denies room membership when user is not an organization member', (done) => {
    vi.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(null);

    const client = ClientIO(`http://127.0.0.1:${port}`, {
      auth: { token: validToken },
      transports: ['websocket'],
      reconnection: false
    });

    client.on('connect', () => {
      client.emit('join:organization', 'unauthorized-org-id', (res: { success: boolean; error?: string }) => {
        expect(res.success).toBe(false);
        expect(res.error).toContain('Unauthorized organization room access');
        client.close();
        done();
      });
    });
  });
});
