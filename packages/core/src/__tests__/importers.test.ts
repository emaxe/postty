import { describe, it, expect } from 'vitest';
import {
  parseCurlCommand,
  curlToRequestItem,
  tokenizeShellArgs,
  parsePostmanCollection,
  parseOpenApiSpec,
} from '../index.js';

describe('cURL Importer', () => {
  it('tokenizes shell commands with various quotes and escapes', () => {
    const cmd = `curl -X POST "https://api.example.com/v1/users" -H 'Content-Type: application/json' -d '{"name": "Alice"}'`;
    const tokens = tokenizeShellArgs(cmd);
    expect(tokens).toEqual([
      'curl',
      '-X',
      'POST',
      'https://api.example.com/v1/users',
      '-H',
      'Content-Type: application/json',
      '-d',
      '{"name": "Alice"}',
    ]);
  });

  it('parses basic GET cURL', () => {
    const cmd = 'curl https://jsonplaceholder.typicode.com/todos/1';
    const parsed = parseCurlCommand(cmd);

    expect(parsed.method).toBe('GET');
    expect(parsed.url).toBe('https://jsonplaceholder.typicode.com/todos/1');
    expect(parsed.body.mode).toBe('none');
  });

  it('parses POST cURL with headers and JSON body', () => {
    const cmd = `curl -X POST https://api.example.com/items \\
      -H 'Content-Type: application/json' \\
      -H 'Accept: application/json' \\
      -d '{"title": "Item 1", "price": 99}'`;

    const parsed = parseCurlCommand(cmd);
    expect(parsed.method).toBe('POST');
    expect(parsed.url).toBe('https://api.example.com/items');
    expect(parsed.headers.length).toBe(2);
    expect(parsed.headers[0].key).toBe('Content-Type');
    expect(parsed.headers[0].value).toBe('application/json');
    expect(parsed.body.mode).toBe('raw');
    if (parsed.body.mode === 'raw') {
      expect(parsed.body.language).toBe('json');
      expect(JSON.parse(parsed.body.raw)).toEqual({ title: 'Item 1', price: 99 });
    }
  });

  it('parses Bearer token from Authorization header into auth', () => {
    const cmd = `curl https://api.example.com/me -H 'Authorization: Bearer secret-token-123'`;
    const parsed = parseCurlCommand(cmd);

    expect(parsed.auth.type).toBe('bearer');
    if (parsed.auth.type === 'bearer') {
      expect(parsed.auth.token).toBe('secret-token-123');
    }
  });

  it('parses Basic auth from -u flag', () => {
    const cmd = `curl -u "admin:superpassword" https://api.example.com/secure`;
    const parsed = parseCurlCommand(cmd);

    expect(parsed.auth.type).toBe('basic');
    if (parsed.auth.type === 'basic') {
      expect(parsed.auth.username).toBe('admin');
      expect(parsed.auth.password).toBe('superpassword');
    }
  });

  it('parses query parameters in URL', () => {
    const cmd = `curl "https://api.example.com/search?q=postty&sort=desc&limit=25"`;
    const parsed = parseCurlCommand(cmd);

    expect(parsed.url).toBe('https://api.example.com/search');
    expect(parsed.queryParams.length).toBe(3);
    expect(parsed.queryParams.find((p) => p.key === 'q')?.value).toBe('postty');
    expect(parsed.queryParams.find((p) => p.key === 'limit')?.value).toBe('25');
  });

  it('converts cURL to a complete Postty RequestItem', () => {
    const colId = crypto.randomUUID();
    const cmd = `curl -X DELETE https://api.example.com/users/42`;
    const item = curlToRequestItem(cmd, colId);

    expect(item.collectionId).toBe(colId);
    expect(item.method).toBe('DELETE');
    expect(item.url).toBe('https://api.example.com/users/42');
  });
});

describe('Postman Importer', () => {
  it('parses a Postman collection JSON with folders and requests', () => {
    const workspaceId = crypto.randomUUID();
    const postmanJson = {
      info: {
        name: 'Echo API',
        description: 'Postman Echo Collection',
      },
      item: [
        {
          name: 'Utilities',
          item: [
            {
              name: 'GET Request',
              request: {
                method: 'GET',
                url: {
                  raw: 'https://postman-echo.com/get?foo1=bar1',
                  query: [{ key: 'foo1', value: 'bar1' }],
                },
                header: [{ key: 'Accept', value: 'application/json' }],
              },
            },
          ],
        },
        {
          name: 'POST Raw Text',
          request: {
            method: 'POST',
            url: 'https://postman-echo.com/post',
            body: {
              mode: 'raw',
              raw: '{"hello": "world"}',
              options: { raw: { language: 'json' } },
            },
          },
        },
      ],
    };

    const result = parsePostmanCollection(postmanJson, workspaceId);

    expect(result.collection.name).toBe('Echo API');
    expect(result.collection.workspaceId).toBe(workspaceId);
    expect(result.folders.length).toBe(1);
    expect(result.folders[0].name).toBe('Utilities');
    expect(result.requests.length).toBe(2);

    const getReq = result.requests.find((r) => r.name === 'GET Request');
    expect(getReq).toBeDefined();
    expect(getReq?.method).toBe('GET');
    expect(getReq?.queryParams.length).toBe(1);
    expect(getReq?.queryParams[0].key).toBe('foo1');
    expect(getReq?.folderId).toBe(result.folders[0].id);

    const postReq = result.requests.find((r) => r.name === 'POST Raw Text');
    expect(postReq).toBeDefined();
    expect(postReq?.method).toBe('POST');
    expect(postReq?.body.mode).toBe('raw');
  });
});

describe('OpenAPI Importer', () => {
  it('parses OpenAPI 3.0 spec with tags, operations, and schemas', () => {
    const workspaceId = crypto.randomUUID();
    const openApiJson = {
      openapi: '3.0.0',
      info: {
        title: 'Petstore API',
        description: 'Sample Petstore',
      },
      servers: [{ url: 'https://petstore.example.com/v1' }],
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            tags: ['Pets'],
            parameters: [
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', default: 20 },
              },
            ],
          },
          post: {
            summary: 'Create a pet',
            tags: ['Pets'],
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: 'Fido' },
                      tag: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = parseOpenApiSpec(openApiJson, workspaceId);

    expect(result.collection.name).toBe('Petstore API');
    expect(result.folders.length).toBe(1);
    expect(result.folders[0].name).toBe('Pets');
    expect(result.requests.length).toBe(2);

    const listPets = result.requests.find((r) => r.method === 'GET');
    expect(listPets?.url).toBe('https://petstore.example.com/v1/pets');
    expect(listPets?.queryParams.length).toBe(1);
    expect(listPets?.queryParams[0].key).toBe('limit');

    const createPet = result.requests.find((r) => r.method === 'POST');
    expect(createPet?.body.mode).toBe('raw');
    if (createPet?.body.mode === 'raw') {
      const parsedBody = JSON.parse(createPet.body.raw);
      expect(parsedBody.name).toBe('Fido');
    }
  });
});
