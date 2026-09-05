import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/memory-db.js';
import {
  Collection,
  CollectionSchema,
  Environment,
  EnvironmentSchema,
  RequestItem,
  RequestItemSchema,
  SyncMutation,
  SyncPushRequestSchema,
} from '@postty/contracts';

export const syncRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // 1. Get full current state of workspace
  fastify.get('/:workspaceId/state', async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const jwtUser = request.user as { userId: string };

    const isMember = db.members.some(
      (m) => m.userId === jwtUser.userId && m.workspaceId === workspaceId
    );
    if (!isMember) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const collections = Array.from(db.collections.values()).filter(
      (c) => c.workspaceId === workspaceId
    );
    const colIds = new Set(collections.map((c) => c.id));
    const requests = Array.from(db.requests.values()).filter((r) =>
      colIds.has(r.collectionId)
    );
    const environments = Array.from(db.environments.values()).filter(
      (e) => e.workspaceId === workspaceId
    );

    return reply.send({
      workspaceId,
      collections,
      requests,
      environments,
      version: db.mutations.get(workspaceId)?.length || 0,
    });
  });

  // 2. Push mutations from client to cloud
  fastify.post('/:workspaceId/push', async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const parsed = SyncPushRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid sync payload', details: parsed.error.format() });
    }

    const jwtUser = request.user as { userId: string };
    const isMember = db.members.some(
      (m) => m.userId === jwtUser.userId && m.workspaceId === workspaceId
    );
    if (!isMember) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const currentMutations = db.mutations.get(workspaceId) || [];
    let currentVersion = currentMutations.length;

    for (const mutation of parsed.data.mutations) {
      currentVersion++;
      const storedMutation: SyncMutation = {
        ...mutation,
        version: currentVersion,
        timestamp: Date.now(),
      };
      currentMutations.push(storedMutation);

      // Apply mutation to database
      if (mutation.action === 'upsert' && mutation.payload) {
        if (mutation.entityType === 'collection') {
          const col = CollectionSchema.safeParse(mutation.payload);
          if (col.success) db.collections.set(mutation.entityId, col.data);
        } else if (mutation.entityType === 'request') {
          const req = RequestItemSchema.safeParse(mutation.payload);
          if (req.success) db.requests.set(mutation.entityId, req.data);
        } else if (mutation.entityType === 'environment') {
          const env = EnvironmentSchema.safeParse(mutation.payload);
          if (env.success) db.environments.set(mutation.entityId, env.data);
        }
      } else if (mutation.action === 'delete') {
        if (mutation.entityType === 'collection') {
          db.collections.delete(mutation.entityId);
        } else if (mutation.entityType === 'request') {
          db.requests.delete(mutation.entityId);
        } else if (mutation.entityType === 'environment') {
          db.environments.delete(mutation.entityId);
        }
      }
    }

    db.mutations.set(workspaceId, currentMutations);

    return reply.send({
      success: true,
      appliedCount: parsed.data.mutations.length,
      latestVersion: currentVersion,
    });
  });

  // 3. Pull delta mutations since version
  fastify.get('/:workspaceId/pull', async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const { sinceVersion = '0' } = request.query as { sinceVersion?: string };
    const since = parseInt(sinceVersion, 10) || 0;

    const allMutations = db.mutations.get(workspaceId) || [];
    const newMutations = allMutations.filter((m) => m.version > since);

    return reply.send({
      workspaceId,
      latestVersion: allMutations.length,
      mutations: newMutations,
    });
  });
};
