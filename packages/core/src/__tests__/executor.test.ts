import { describe, expect, it } from 'vitest';
import { RequestItem, HttpResponse } from '@postty/contracts';
import { RequestExecutor } from '../executor.js';
import { HttpRequestOptions, HttpTransport } from '../transport.js';

class MockTransport implements HttpTransport {
  public lastRequestOptions?: HttpRequestOptions;
  public mockResponse: HttpResponse = {
    statusCode: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    body: '{"status":"ok"}',
    sizeBytes: 15,
    timing: { totalDurationMs: 42 },
    timestamp: Date.now(),
  };

  async execute(options: HttpRequestOptions): Promise<HttpResponse> {
    this.lastRequestOptions = options;
    return this.mockResponse;
  }
}

describe('RequestExecutor', () => {
  it('should build and execute a GET request with query params and headers', async () => {
    const mockTransport = new MockTransport();
    const executor = new RequestExecutor(mockTransport);

    const request: RequestItem = {
      id: 'a0000000-0000-0000-0000-000000000001',
      collectionId: 'c0000000-0000-0000-0000-000000000001',
      folderId: null,
      name: 'Get Users',
      method: 'GET',
      url: '{{baseUrl}}/users',
      queryParams: [
        { id: '1', key: 'page', value: '1', enabled: true },
        { id: '2', key: 'disabled_param', value: 'ignore', enabled: false },
      ],
      headers: [
        { id: 'h1', key: 'X-Custom-Header', value: '{{headerVal}}', enabled: true },
      ],
      body: { mode: 'none' },
      auth: { type: 'bearer', token: '{{token}}' },
      preRequestScript: '',
      testScript: '',
      orderIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const variables = {
      baseUrl: 'https://api.example.com',
      headerVal: 'my-custom-value',
      token: 'jwt-12345',
    };

    const response = await executor.execute({ request, variables });

    expect(response.statusCode).toBe(200);
    expect(mockTransport.lastRequestOptions).toBeDefined();
    expect(mockTransport.lastRequestOptions?.url).toBe('https://api.example.com/users?page=1');
    expect(mockTransport.lastRequestOptions?.method).toBe('GET');
    expect(mockTransport.lastRequestOptions?.headers['x-custom-header']).toBe('my-custom-value');
    expect(mockTransport.lastRequestOptions?.headers['authorization']).toBe('Bearer jwt-12345');
  });

  it('should format JSON body and set content-type', async () => {
    const mockTransport = new MockTransport();
    const executor = new RequestExecutor(mockTransport);

    const request: RequestItem = {
      id: 'a0000000-0000-0000-0000-000000000002',
      collectionId: 'c0000000-0000-0000-0000-000000000001',
      folderId: null,
      name: 'Create User',
      method: 'POST',
      url: 'https://api.example.com/users',
      queryParams: [],
      headers: [],
      body: {
        mode: 'raw',
        language: 'json',
        raw: '{"username":"{{name}}"}',
      },
      auth: { type: 'none' },
      preRequestScript: '',
      testScript: '',
      orderIndex: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await executor.execute({ request, variables: { name: 'alice' } });

    expect(mockTransport.lastRequestOptions?.body).toBe('{"username":"alice"}');
    expect(mockTransport.lastRequestOptions?.headers['content-type']).toBe('application/json');
  });
});
