import crypto from 'node:crypto';
import {
  Collection,
  Environment,
  RequestItem,
  SyncMutation,
  Workspace,
  WorkspaceMember,
} from '@postty/contracts';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  createdAt: string;
}

export interface DeviceCodeRecord {
  deviceCode: string;
  userCode: string;
  userId: string | null;
  status: 'pending' | 'authorized' | 'expired';
  expiresAt: number;
}

export class Database {
  public users: Map<string, UserRecord> = new Map();
  public workspaces: Map<string, Workspace> = new Map();
  public members: WorkspaceMember[] = [];
  public collections: Map<string, Collection> = new Map();
  public requests: Map<string, RequestItem> = new Map();
  public environments: Map<string, Environment> = new Map();
  public deviceCodes: Map<string, DeviceCodeRecord> = new Map();
  public mutations: Map<string, SyncMutation[]> = new Map(); // workspaceId -> mutations

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    // Seed default demo user: maksim@postty.dev / password123
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto
      .scryptSync('password123', salt, 64)
      .toString('hex');

    const demoUserId = 'u0000000-0000-0000-0000-000000000001';
    const demoWorkspaceId = '00000000-0000-0000-0000-000000000001';

    const demoUser: UserRecord = {
      id: demoUserId,
      email: 'maksim@postty.dev',
      passwordHash,
      salt,
      name: 'Maksim Klisin',
      createdAt: new Date().toISOString(),
    };
    this.users.set(demoUserId, demoUser);

    const defaultWorkspace: Workspace = {
      id: demoWorkspaceId,
      name: 'Personal Space',
      type: 'personal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.workspaces.set(demoWorkspaceId, defaultWorkspace);

    this.members.push({
      userId: demoUserId,
      workspaceId: demoWorkspaceId,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    });

    const demoCollectionId = 'c0000000-0000-0000-0000-000000000001';
    const demoCollection: Collection = {
      id: demoCollectionId,
      workspaceId: demoWorkspaceId,
      name: 'JSONPlaceholder API',
      description: 'Default synced collection',
      auth: { type: 'none' },
      preRequestScript: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.collections.set(demoCollectionId, demoCollection);

    const demoRequest: RequestItem = {
      id: 'r0000000-0000-0000-0000-000000000001',
      collectionId: demoCollectionId,
      folderId: null,
      name: 'Get All Users',
      method: 'GET',
      url: '{{baseUrl}}/users',
      queryParams: [{ id: 'q1', key: 'limit', value: '10', enabled: true }],
      headers: [{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }],
      body: { mode: 'none' },
      auth: { type: 'inherit' },
      preRequestScript: '',
      testScript: '',
      orderIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.requests.set(demoRequest.id, demoRequest);

    const demoEnv: Environment = {
      id: 'e0000000-0000-0000-0000-000000000001',
      workspaceId: demoWorkspaceId,
      name: 'Development',
      variables: [
        {
          id: 'v1',
          key: 'baseUrl',
          value: 'https://jsonplaceholder.typicode.com',
          enabled: true,
          isSecret: false,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.environments.set(demoEnv.id, demoEnv);
  }
}

export const db = new Database();
