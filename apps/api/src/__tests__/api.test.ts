import { describe, expect, it } from 'vitest';
import { buildServer } from '../server.js';
import { FastifyInstance } from 'fastify';

describe('Postty Cloud API & Sync', () => {
  const server: FastifyInstance = buildServer();

  it('GET /health should return status ok', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('postty-api');
  });

  it('POST /api/v1/auth/login should log in seeded user and return JWT', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'maksim@postty.dev',
        password: 'password123',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.token).toBeDefined();
    expect(body.user.email).toBe('maksim@postty.dev');
  });

  it('GET /api/v1/auth/me should return authenticated user profile', async () => {
    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'maksim@postty.dev', password: 'password123' },
    });
    const { token } = JSON.parse(loginRes.body);

    const meRes = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(meRes.statusCode).toBe(200);
    const me = JSON.parse(meRes.body);
    expect(me.email).toBe('maksim@postty.dev');
    expect(me.name).toBe('Maksim Klisin');
  });

  it('GET /api/v1/workspaces should list user workspaces', async () => {
    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'maksim@postty.dev', password: 'password123' },
    });
    const { token } = JSON.parse(loginRes.body);

    const wsRes = await server.inject({
      method: 'GET',
      url: '/api/v1/workspaces',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(wsRes.statusCode).toBe(200);
    const body = JSON.parse(wsRes.body);
    expect(body.workspaces.length).toBeGreaterThanOrEqual(1);
    expect(body.workspaces[0].name).toBe('Personal Space');
  });

  it('GET & POST /api/v1/sync should retrieve state and push mutations', async () => {
    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'maksim@postty.dev', password: 'password123' },
    });
    const { token } = JSON.parse(loginRes.body);
    const workspaceId = '00000000-0000-0000-0000-000000000001';

    // 1. Get initial state
    const stateRes = await server.inject({
      method: 'GET',
      url: `/api/v1/sync/${workspaceId}/state`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(stateRes.statusCode).toBe(200);
    const state = JSON.parse(stateRes.body);
    expect(state.collections.length).toBeGreaterThan(0);

    // 2. Push mutation (upsert new collection)
    const newColId = 'c0000000-0000-0000-0000-999999999999';
    const pushRes = await server.inject({
      method: 'POST',
      url: `/api/v1/sync/${workspaceId}/push`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        workspaceId,
        lastSyncedVersion: 0,
        mutations: [
          {
            id: 'b0000000-0000-0000-0000-000000000001',
            entityType: 'collection',
            entityId: newColId,
            action: 'upsert',
            payload: {
              id: newColId,
              workspaceId,
              name: 'Cloud Synced Collection',
              auth: { type: 'none' },
              preRequestScript: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            version: 1,
            timestamp: Date.now(),
          },
        ],
      },
    });

    expect(pushRes.statusCode).toBe(200);
    const pushBody = JSON.parse(pushRes.body);
    expect(pushBody.success).toBe(true);
    expect(pushBody.appliedCount).toBe(1);

    // 3. Pull delta mutations
    const pullRes = await server.inject({
      method: 'GET',
      url: `/api/v1/sync/${workspaceId}/pull?sinceVersion=0`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(pullRes.statusCode).toBe(200);
    const pullBody = JSON.parse(pullRes.body);
    expect(pullBody.mutations.length).toBeGreaterThanOrEqual(1);
    expect(pullBody.mutations[0].entityId).toBe(newColId);
  });

  it('OAuth 2.0 Device Flow (RFC 8628) for CLI/TUI', async () => {
    // 1. CLI requests device code
    const codeRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/device/code',
    });
    expect(codeRes.statusCode).toBe(200);
    const codeData = JSON.parse(codeRes.body);
    expect(codeData.deviceCode).toBeDefined();
    expect(codeData.userCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    // 2. CLI polls while pending
    const pollPendingRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/device/token',
      payload: { deviceCode: codeData.deviceCode },
    });
    expect(pollPendingRes.statusCode).toBe(400);
    expect(JSON.parse(pollPendingRes.body).error).toBe('authorization_pending');

    // 3. User authorizes device in Web UI
    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'maksim@postty.dev', password: 'password123' },
    });
    const { token: userJwt } = JSON.parse(loginRes.body);

    const authRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/device/authorize',
      headers: { authorization: `Bearer ${userJwt}` },
      payload: { userCode: codeData.userCode },
    });
    expect(authRes.statusCode).toBe(200);

    // 4. CLI polls again and successfully receives token
    const pollSuccessRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/device/token',
      payload: { deviceCode: codeData.deviceCode },
    });
    expect(pollSuccessRes.statusCode).toBe(200);
    const finalTokenData = JSON.parse(pollSuccessRes.body);
    expect(finalTokenData.token).toBeDefined();
    expect(finalTokenData.user.email).toBe('maksim@postty.dev');
  });
});
