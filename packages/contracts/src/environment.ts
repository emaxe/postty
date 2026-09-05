import { z } from 'zod';

export const EnvironmentVariableSchema = z.object({
  id: z.string().uuid().default(() => crypto.randomUUID()),
  key: z.string().min(1, 'Key cannot be empty'),
  value: z.string(),
  enabled: z.boolean().default(true),
  isSecret: z.boolean().default(false),
  description: z.string().optional(),
});
export type EnvironmentVariable = z.infer<typeof EnvironmentVariableSchema>;

export const EnvironmentSchema = z.object({
  id: z.string().uuid().default(() => crypto.randomUUID()),
  workspaceId: z.string().uuid(),
  name: z.string().min(1, 'Environment name cannot be empty'),
  variables: z.array(EnvironmentVariableSchema).default([]),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type Environment = z.infer<typeof EnvironmentSchema>;
