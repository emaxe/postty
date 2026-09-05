import { z } from 'zod';

export const SyncEntityTypeSchema = z.enum([
  'workspace',
  'collection',
  'folder',
  'request',
  'environment',
]);
export type SyncEntityType = z.infer<typeof SyncEntityTypeSchema>;

export const SyncActionSchema = z.enum(['upsert', 'delete']);
export type SyncAction = z.infer<typeof SyncActionSchema>;

export const SyncMutationSchema = z.object({
  id: z.string().uuid().default(() => crypto.randomUUID()),
  entityType: SyncEntityTypeSchema,
  entityId: z.string().uuid(),
  action: SyncActionSchema,
  payload: z.record(z.string(), z.any()).optional(),
  version: z.number().int().nonnegative(),
  timestamp: z.number(),
});
export type SyncMutation = z.infer<typeof SyncMutationSchema>;

export const SyncPushRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  lastSyncedVersion: z.number().int().nonnegative(),
  mutations: z.array(SyncMutationSchema),
});
export type SyncPushRequest = z.infer<typeof SyncPushRequestSchema>;

export const SyncPullResponseSchema = z.object({
  workspaceId: z.string().uuid(),
  latestVersion: z.number().int().nonnegative(),
  mutations: z.array(SyncMutationSchema),
});
export type SyncPullResponse = z.infer<typeof SyncPullResponseSchema>;
