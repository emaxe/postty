import { z } from 'zod';

export const UserRoleSchema = z.enum(['owner', 'admin', 'editor', 'viewer']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const WorkspaceMemberSchema = z.object({
  userId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  role: UserRoleSchema,
  joinedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

export const WorkspaceSchema = z.object({
  id: z.string().uuid().default(() => crypto.randomUUID()),
  name: z.string().min(1, 'Workspace name cannot be empty'),
  type: z.enum(['personal', 'team']).default('personal'),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;
