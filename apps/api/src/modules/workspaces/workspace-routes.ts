import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/memory-db.js';
import { Workspace } from '@postty/contracts';

export const workspaceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Get all workspaces for current user
  fastify.get('/', async (request, reply) => {
    const jwtUser = request.user as { userId: string };
    const userMemberships = db.members.filter((m) => m.userId === jwtUser.userId);
    const workspaces = userMemberships
      .map((m) => {
        const ws = db.workspaces.get(m.workspaceId);
        return ws ? { ...ws, role: m.role } : null;
      })
      .filter(Boolean);

    return reply.send({ workspaces });
  });

  // Create a new workspace
  fastify.post('/', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1),
      type: z.enum(['personal', 'team']).default('team'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation Error' });
    }

    const jwtUser = request.user as { userId: string };
    const workspaceId = crypto.randomUUID();

    const workspace: Workspace = {
      id: workspaceId,
      name: parsed.data.name,
      type: parsed.data.type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.workspaces.set(workspaceId, workspace);

    db.members.push({
      userId: jwtUser.userId,
      workspaceId,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    });

    return reply.status(201).send(workspace);
  });
};
