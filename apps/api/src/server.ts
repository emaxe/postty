import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { authRoutes } from './modules/auth/auth-routes.js';
import { workspaceRoutes } from './modules/workspaces/workspace-routes.js';
import { syncRoutes } from './modules/sync/sync-routes.js';

export function buildServer(): FastifyInstance {
  const server = Fastify({
    logger: false,
  });

  // CORS
  server.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // JWT
  server.register(jwt, {
    secret: process.env.JWT_SECRET || 'postty-super-secret-jwt-key-for-dev',
  });

  // Health check
  server.get('/health', async () => {
    return { status: 'ok', time: new Date().toISOString(), service: 'postty-api' };
  });

  // API v1 Routes
  server.register(authRoutes, { prefix: '/api/v1/auth' });
  server.register(workspaceRoutes, { prefix: '/api/v1/workspaces' });
  server.register(syncRoutes, { prefix: '/api/v1/sync' });

  return server;
}
