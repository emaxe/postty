import { z } from 'zod';
import {
  AuthConfigSchema,
  HttpMethodSchema,
  KeyValueParamSchema,
  RequestBodySchema,
} from './http.js';

export const RequestItemSchema = z.object({
  id: z.string().uuid().default(() => crypto.randomUUID()),
  collectionId: z.string().uuid(),
  folderId: z.string().uuid().nullable().default(null),
  name: z.string().min(1, 'Request name cannot be empty'),
  method: HttpMethodSchema.default('GET'),
  url: z.string().default(''),
  headers: z.array(KeyValueParamSchema).default([]),
  queryParams: z.array(KeyValueParamSchema).default([]),
  body: RequestBodySchema.default({ mode: 'none' }),
  auth: AuthConfigSchema.default({ type: 'inherit' }),
  preRequestScript: z.string().default(''),
  testScript: z.string().default(''),
  orderIndex: z.number().default(0),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type RequestItem = z.infer<typeof RequestItemSchema>;

export const FolderSchema = z.object({
  id: z.string().uuid().default(() => crypto.randomUUID()),
  collectionId: z.string().uuid(),
  parentId: z.string().uuid().nullable().default(null),
  name: z.string().min(1, 'Folder name cannot be empty'),
  auth: AuthConfigSchema.default({ type: 'inherit' }),
  preRequestScript: z.string().default(''),
  orderIndex: z.number().default(0),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type Folder = z.infer<typeof FolderSchema>;

export const CollectionSchema = z.object({
  id: z.string().uuid().default(() => crypto.randomUUID()),
  workspaceId: z.string().uuid(),
  name: z.string().min(1, 'Collection name cannot be empty'),
  description: z.string().optional(),
  auth: AuthConfigSchema.default({ type: 'none' }),
  preRequestScript: z.string().default(''),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type Collection = z.infer<typeof CollectionSchema>;
