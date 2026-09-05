import {
  Collection,
  Folder,
  HttpMethod,
  KeyValueParam,
  RequestBody,
  RequestItem,
} from '@postty/contracts';

export interface OpenApiImportResult {
  collection: Collection;
  folders: Folder[];
  requests: RequestItem[];
}

export function parseOpenApiSpec(
  specContent: string | Record<string, any>,
  workspaceId: string
): OpenApiImportResult {
  const data = typeof specContent === 'string' ? JSON.parse(specContent) : specContent;

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid OpenAPI/Swagger JSON format');
  }

  const collectionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const title = data.info?.title || 'Imported OpenAPI Spec';
  const description = data.info?.description;

  const collection: Collection = {
    id: collectionId,
    workspaceId,
    name: title,
    description,
    auth: { type: 'none' },
    preRequestScript: '',
    createdAt: now,
    updatedAt: now,
  };

  // Determine base URL
  let baseUrl = '';
  if (Array.isArray(data.servers) && data.servers[0]?.url) {
    baseUrl = data.servers[0].url;
  } else if (data.host) {
    const scheme = (data.schemes && data.schemes[0]) || 'https';
    const basePath = data.basePath || '';
    baseUrl = `${scheme}://${data.host}${basePath}`;
  }

  // Trim trailing slash from baseUrl
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  const requests: RequestItem[] = [];
  const foldersMap = new Map<string, Folder>();
  const paths = data.paths || {};
  let orderIndex = 0;

  const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  for (const [pathStr, pathItem] of Object.entries<any>(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    for (const m of httpMethods) {
      const lowerMethod = m.toLowerCase();
      const operation = pathItem[lowerMethod];
      if (!operation) continue;

      orderIndex++;
      const reqId = crypto.randomUUID();

      // Tag-based folder categorization
      let folderId: string | null = null;
      if (Array.isArray(operation.tags) && operation.tags[0]) {
        const tagName = String(operation.tags[0]);
        if (!foldersMap.has(tagName)) {
          const newFolder: Folder = {
            id: crypto.randomUUID(),
            collectionId,
            parentId: null,
            name: tagName,
            auth: { type: 'inherit' },
            preRequestScript: '',
            orderIndex: foldersMap.size,
            createdAt: now,
            updatedAt: now,
          };
          foldersMap.set(tagName, newFolder);
        }
        folderId = foldersMap.get(tagName)!.id;
      }

      // Parameters (path, query, header)
      const combinedParams = [
        ...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []),
        ...(Array.isArray(operation.parameters) ? operation.parameters : []),
      ];

      const queryParams: KeyValueParam[] = [];
      const headers: KeyValueParam[] = [];

      for (const p of combinedParams) {
        if (!p || !p.name) continue;
        if (p.in === 'query') {
          queryParams.push({
            id: crypto.randomUUID(),
            key: p.name,
            value: p.example !== undefined ? String(p.example) : (p.schema?.default !== undefined ? String(p.schema.default) : ''),
            description: p.description,
            enabled: p.required ?? false,
          });
        } else if (p.in === 'header') {
          headers.push({
            id: crypto.randomUUID(),
            key: p.name,
            value: p.example !== undefined ? String(p.example) : '',
            description: p.description,
            enabled: p.required ?? false,
          });
        }
      }

      // Convert path parameter braces /pets/{id} -> /pets/:id or keep /pets/{{id}}
      const fullUrl = `${baseUrl}${pathStr}`;

      // Request Body (OpenAPI 3 requestBody or Swagger 2 body parameter)
      let body: RequestBody = { mode: 'none' };
      if (operation.requestBody?.content) {
        const content = operation.requestBody.content;
        if (content['application/json']) {
          const jsonSchema = content['application/json'].schema;
          const example = content['application/json'].example || generateMockFromSchema(jsonSchema);
          body = {
            mode: 'raw',
            raw: JSON.stringify(example, null, 2),
            language: 'json',
          };
          headers.unshift({
            id: crypto.randomUUID(),
            key: 'Content-Type',
            value: 'application/json',
            enabled: true,
          });
        } else if (content['application/x-www-form-urlencoded']) {
          body = {
            mode: 'urlencoded',
            urlencoded: [],
          };
        }
      } else {
        const bodyParam = combinedParams.find((p) => p.in === 'body');
        if (bodyParam?.schema) {
          const example = bodyParam.example || generateMockFromSchema(bodyParam.schema);
          body = {
            mode: 'raw',
            raw: JSON.stringify(example, null, 2),
            language: 'json',
          };
          headers.unshift({
            id: crypto.randomUUID(),
            key: 'Content-Type',
            value: 'application/json',
            enabled: true,
          });
        }
      }

      const reqName = operation.summary || operation.operationId || `${m} ${pathStr}`;

      const requestItem: RequestItem = {
        id: reqId,
        collectionId,
        folderId,
        name: reqName,
        method: m,
        url: fullUrl,
        headers,
        queryParams,
        body,
        auth: { type: 'inherit' },
        preRequestScript: '',
        testScript: '',
        orderIndex,
        createdAt: now,
        updatedAt: now,
      };

      requests.push(requestItem);
    }
  }

  return {
    collection,
    folders: Array.from(foldersMap.values()),
    requests,
  };
}

function generateMockFromSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return {};
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  if (schema.type === 'object' || schema.properties) {
    const mock: Record<string, any> = {};
    if (schema.properties) {
      for (const [k, v] of Object.entries<any>(schema.properties)) {
        mock[k] = generateMockFromSchema(v);
      }
    }
    return mock;
  }

  if (schema.type === 'array' || schema.items) {
    return [generateMockFromSchema(schema.items || {})];
  }

  if (schema.type === 'string') return 'string';
  if (schema.type === 'integer' || schema.type === 'number') return 0;
  if (schema.type === 'boolean') return true;

  return {};
}
