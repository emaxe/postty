import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AuthService } from './auth-service.js';
import { db } from '../../db/memory-db.js';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. User Registration
  fastify.post('/register', async (request, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(1),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
    }

    try {
      const user = AuthService.registerUser(parsed.data.email, parsed.data.password, parsed.data.name);
      const token = fastify.jwt.sign({ userId: user.id, email: user.email });

      return reply.status(201).send({
        token,
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (err: any) {
      return reply.status(409).send({ error: err.message });
    }
  });

  // 2. User Login
  fastify.post('/login', async (request, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation Error' });
    }

    try {
      const user = AuthService.loginUser(parsed.data.email, parsed.data.password);
      const token = fastify.jwt.sign({ userId: user.id, email: user.email });

      return reply.send({
        token,
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (err: any) {
      return reply.status(401).send({ error: err.message });
    }
  });

  // 3. Current User Profile
  fastify.get('/me', {
    onRequest: [async (req, reply) => {
      try {
        await req.jwtVerify();
      } catch (err) {
        reply.status(401).send({ error: 'Unauthorized' });
      }
    }],
  }, async (request, reply) => {
    const jwtUser = request.user as { userId: string };
    const user = db.users.get(jwtUser.userId);
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    });
  });

  // --- Device Flow (RFC 8628) for CLI / TUI ---

  // 4. Request Device Code (CLI calls this)
  fastify.post('/device/code', async (_request, reply) => {
    const data = AuthService.createDeviceCode();
    return reply.send(data);
  });

  // 5. Poll for Device Token (CLI polls this every interval seconds)
  fastify.post('/device/token', async (request, reply) => {
    const schema = z.object({
      deviceCode: z.string(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid device code' });
    }

    const { status, userId } = AuthService.pollDeviceToken(parsed.data.deviceCode);

    if (status === 'pending') {
      return reply.status(400).send({ error: 'authorization_pending' });
    }

    if (status === 'expired' || !userId) {
      return reply.status(400).send({ error: 'expired_token' });
    }

    const user = db.users.get(userId);
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const token = fastify.jwt.sign({ userId: user.id, email: user.email });
    return reply.send({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  });

  // 6. Authorize Device (User submits userCode in Web Browser)
  fastify.post('/device/authorize', {
    onRequest: [async (req, reply) => {
      try {
        await req.jwtVerify();
      } catch (err) {
        reply.status(401).send({ error: 'Unauthorized' });
      }
    }],
  }, async (request, reply) => {
    const schema = z.object({
      userCode: z.string(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid user code' });
    }

    const jwtUser = request.user as { userId: string };
    const success = AuthService.authorizeDevice(parsed.data.userCode, jwtUser.userId);

    if (!success) {
      return reply.status(400).send({ error: 'Invalid or expired user code' });
    }

    return reply.send({ success: true, message: 'Device successfully authorized' });
  });
};
