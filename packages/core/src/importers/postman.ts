import {
  AuthConfig,
  Collection,
  Folder,
  HttpMethod,
  KeyValueParam,
  RequestBody,
  RequestItem,
} from '@postty/contracts';

export interface PostmanImportResult {
  collection: Collection;
  folders: Folder[];
  requests: RequestItem[];
}

export function parsePostmanCollection(
  jsonContent: string | Record<string, any>,
  workspaceId: string
): PostmanImportResult {
  const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid Postman Collection JSON format: root is not an object');
  }

  const collectionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const colName = data.info?.name || 'Imported Postman Collection';
  const colDesc = typeof data.info?.description === 'string'
    ? data.info.description
    : data.info?.description?.content || undefined;

  const collection: Collection = {
    id: collectionId,
    workspaceId,
    name: colName,
    description: colDesc,
    auth: { type: 'none' },
    preRequestScript: '',
    createdAt: now,
    updatedAt: now,
  };

  const folders: Folder[] = [];
  const requests: RequestItem[] = [];

  function processItems(items: any[], parentFolderId: string | null = null) {
    if (!Array.isArray(items)) return;

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (!item) continue;

      // If item has child items, it's a folder
      if (Array.isArray(item.item)) {
        const folderId = crypto.randomUUID();
        const folder: Folder = {
          id: folderId,
          collectionId,
          parentId: parentFolderId,
          name: item.name || `Folder ${folders.length + 1}`,
          auth: { type: 'inherit' },
          preRequestScript: '',
          orderIndex: index,
          createdAt: now,
          updatedAt: now,
        };
        folders.push(folder);
        processItems(item.item, folderId);
      } else if (item.request) {
        // It's a request
        const req = convertPostmanRequest(item, collectionId, parentFolderId, index, now);
        requests.push(req);
      }
    }
  }

  processItems(data.item || []);

  return { collection, folders, requests };
}

function convertPostmanRequest(
  item: any,
  collectionId: string,
  folderId: string | null,
  orderIndex: number,
  now: string
): RequestItem {
  const pReq = item.request || {};

  // Method
  const method: HttpMethod = (
    typeof pReq === 'string' ? 'GET' : (pReq.method || 'GET')
  ).toUpperCase() as HttpMethod;

  // URL & Query Params
  let url = '';
  const queryParams: KeyValueParam[] = [];

  if (typeof pReq === 'string') {
    url = pReq;
  } else if (typeof pReq.url === 'string') {
    url = pReq.url;
  } else if (pReq.url && typeof pReq.url === 'object') {
    url = pReq.url.raw || '';
    if (Array.isArray(pReq.url.query)) {
      for (const q of pReq.url.query) {
        queryParams.push({
          id: crypto.randomUUID(),
          key: q.key || '',
          value: q.value || '',
          description: q.description || undefined,
          enabled: q.disabled !== true,
        });
      }
    }
  }

  // If url has query parameters not yet in queryParams, extract them
  if (url.includes('?') && queryParams.length === 0) {
    const qIndex = url.indexOf('?');
    const queryString = url.slice(qIndex + 1);
    url = url.slice(0, qIndex);
    const sp = new URLSearchParams(queryString);
    sp.forEach((val, key) => {
      queryParams.push({
        id: crypto.randomUUID(),
        key,
        value: val,
        enabled: true,
      });
    });
  }

  // Headers
  const headers: KeyValueParam[] = [];
  if (Array.isArray(pReq.header)) {
    for (const h of pReq.header) {
      if (h.key) {
        headers.push({
          id: crypto.randomUUID(),
          key: h.key,
          value: h.value || '',
          description: h.description || undefined,
          enabled: h.disabled !== true,
        });
      }
    }
  }

  // Body
  let body: RequestBody = { mode: 'none' };
  if (pReq.body) {
    const bMode = pReq.body.mode;
    if (bMode === 'raw') {
      const rawText = pReq.body.raw || '';
      let lang: 'json' | 'xml' | 'html' | 'text' = 'text';
      const langOption = pReq.body.options?.raw?.language;
      if (langOption === 'json' || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
        lang = 'json';
      } else if (langOption === 'xml') {
        lang = 'xml';
      } else if (langOption === 'html') {
        lang = 'html';
      }
      body = {
        mode: 'raw',
        raw: rawText,
        language: lang,
      };
    } else if (bMode === 'urlencoded' && Array.isArray(pReq.body.urlencoded)) {
      body = {
        mode: 'urlencoded',
        urlencoded: pReq.body.urlencoded.map((u: any) => ({
          id: crypto.randomUUID(),
          key: u.key || '',
          value: u.value || '',
          description: u.description || undefined,
          enabled: u.disabled !== true,
        })),
      };
    } else if (bMode === 'formdata' && Array.isArray(pReq.body.formdata)) {
      body = {
        mode: 'form-data',
        formData: pReq.body.formdata.map((f: any) => ({
          id: crypto.randomUUID(),
          key: f.key || '',
          value: f.value || '',
          type: f.type === 'file' ? 'file' : 'text',
          enabled: f.disabled !== true,
        })),
      };
    }
  }

  // Auth
  let auth: AuthConfig = { type: 'inherit' };
  if (pReq.auth) {
    const aType = pReq.auth.type;
    if (aType === 'bearer' && Array.isArray(pReq.auth.bearer)) {
      const tokenItem = pReq.auth.bearer.find((b: any) => b.key === 'token');
      auth = {
        type: 'bearer',
        token: tokenItem?.value || '',
      };
    } else if (aType === 'basic' && Array.isArray(pReq.auth.basic)) {
      const u = pReq.auth.basic.find((b: any) => b.key === 'username')?.value || '';
      const p = pReq.auth.basic.find((b: any) => b.key === 'password')?.value || '';
      auth = {
        type: 'basic',
        username: u,
        password: p,
      };
    } else if (aType === 'apikey' && Array.isArray(pReq.auth.apikey)) {
      const k = pReq.auth.apikey.find((b: any) => b.key === 'key')?.value || '';
      const v = pReq.auth.apikey.find((b: any) => b.key === 'value')?.value || '';
      const addTo = pReq.auth.apikey.find((b: any) => b.key === 'in')?.value === 'query' ? 'query' : 'header';
      auth = {
        type: 'apiKey',
        key: k,
        value: v,
        addTo,
      };
    } else if (aType === 'noauth') {
      auth = { type: 'none' };
    }
  }

  return {
    id: crypto.randomUUID(),
    collectionId,
    folderId,
    name: item.name || `${method} Request`,
    method,
    url,
    headers,
    queryParams,
    body,
    auth,
    preRequestScript: '',
    testScript: '',
    orderIndex,
    createdAt: now,
    updatedAt: now,
  };
}
