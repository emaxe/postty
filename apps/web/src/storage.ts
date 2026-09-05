import { Collection, Environment, RequestItem, HttpResponse } from '@postty/contracts';

const COLLECTIONS_KEY = 'postty_collections';
const ENVIRONMENTS_KEY = 'postty_environments';
const ACTIVE_ENV_KEY = 'postty_active_env_id';
const HISTORY_KEY = 'postty_history';

export interface HistoryItem {
  id: string;
  request: RequestItem;
  response: HttpResponse;
  timestamp: number;
}

const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

const INITIAL_ENVIRONMENTS: Environment[] = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    workspaceId: DEFAULT_WORKSPACE_ID,
    name: 'Development (JSONPlaceholder)',
    variables: [
      {
        id: 'v1',
        key: 'baseUrl',
        value: 'https://jsonplaceholder.typicode.com',
        enabled: true,
        isSecret: false,
        description: 'Mock API Server',
      },
      {
        id: 'v2',
        key: 'apiKey',
        value: 'dev_secret_token_12345',
        enabled: true,
        isSecret: true,
        description: 'Secret Dev Token',
      },
      {
        id: 'v3',
        key: 'userId',
        value: '1',
        enabled: true,
        isSecret: false,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'e0000000-0000-0000-0000-000000000002',
    workspaceId: DEFAULT_WORKSPACE_ID,
    name: 'Production',
    variables: [
      {
        id: 'v4',
        key: 'baseUrl',
        value: 'https://api.postty.dev',
        enabled: true,
        isSecret: false,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_COLLECTIONS: Collection[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    workspaceId: DEFAULT_WORKSPACE_ID,
    name: 'JSONPlaceholder API',
    description: 'Sample collection for testing REST endpoints',
    auth: { type: 'none' },
    preRequestScript: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_REQUESTS: RequestItem[] = [
  {
    id: 'r0000000-0000-0000-0000-000000000001',
    collectionId: 'c0000000-0000-0000-0000-000000000001',
    folderId: null,
    name: 'Get All Users',
    method: 'GET',
    url: '{{baseUrl}}/users',
    queryParams: [
      { id: 'q1', key: 'limit', value: '10', enabled: true },
    ],
    headers: [
      { id: 'h1', key: 'Accept', value: 'application/json', enabled: true },
    ],
    body: { mode: 'none' },
    auth: { type: 'inherit' },
    preRequestScript: '',
    testScript: '',
    orderIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'r0000000-0000-0000-0000-000000000002',
    collectionId: 'c0000000-0000-0000-0000-000000000001',
    folderId: null,
    name: 'Get Single User Posts',
    method: 'GET',
    url: '{{baseUrl}}/posts?userId={{userId}}',
    queryParams: [],
    headers: [],
    body: { mode: 'none' },
    auth: { type: 'inherit' },
    preRequestScript: '',
    testScript: '',
    orderIndex: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'r0000000-0000-0000-0000-000000000003',
    collectionId: 'c0000000-0000-0000-0000-000000000001',
    folderId: null,
    name: 'Create Post',
    method: 'POST',
    url: '{{baseUrl}}/posts',
    queryParams: [],
    headers: [],
    body: {
      mode: 'raw',
      language: 'json',
      raw: '{\n  "title": "Postty Web Client",\n  "body": "Testing fast modern API client",\n  "userId": {{userId}}\n}',
    },
    auth: { type: 'inherit' },
    preRequestScript: '',
    testScript: '',
    orderIndex: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getStoredEnvironments(): Environment[] {
  try {
    const raw = localStorage.getItem(ENVIRONMENTS_KEY);
    if (!raw) {
      localStorage.setItem(ENVIRONMENTS_KEY, JSON.stringify(INITIAL_ENVIRONMENTS));
      return INITIAL_ENVIRONMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ENVIRONMENTS;
  }
}

export function saveStoredEnvironments(envs: Environment[]): void {
  localStorage.setItem(ENVIRONMENTS_KEY, JSON.stringify(envs));
}

export function getActiveEnvironmentId(): string | null {
  return localStorage.getItem(ACTIVE_ENV_KEY) || INITIAL_ENVIRONMENTS[0].id;
}

export function setActiveEnvironmentId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_ENV_KEY, id);
  else localStorage.removeItem(ACTIVE_ENV_KEY);
}

export function getStoredCollections(): { collections: Collection[]; requests: RequestItem[] } {
  try {
    const rawCols = localStorage.getItem(COLLECTIONS_KEY);
    const rawReqs = localStorage.getItem('postty_requests');
    if (!rawCols || !rawReqs) {
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(INITIAL_COLLECTIONS));
      localStorage.setItem('postty_requests', JSON.stringify(INITIAL_REQUESTS));
      return { collections: INITIAL_COLLECTIONS, requests: INITIAL_REQUESTS };
    }
    return {
      collections: JSON.parse(rawCols),
      requests: JSON.parse(rawReqs),
    };
  } catch {
    return { collections: INITIAL_COLLECTIONS, requests: INITIAL_REQUESTS };
  }
}

export function saveStoredCollections(collections: Collection[], requests: RequestItem[]): void {
  localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
  localStorage.setItem('postty_requests', JSON.stringify(requests));
}

export function getStoredHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function appendHistory(request: RequestItem, response: HttpResponse): void {
  try {
    const history = getStoredHistory();
    const item: HistoryItem = {
      id: crypto.randomUUID(),
      request,
      response,
      timestamp: Date.now(),
    };
    const updated = [item, ...history].slice(0, 50); // keep last 50
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}
