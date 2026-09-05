import { HttpResponse } from '@postty/contracts';
import { HttpRequestOptions, HttpTransport } from '@postty/core';
import { invoke } from '@tauri-apps/api/core';

export class TauriNativeTransport implements HttpTransport {
  public async execute(options: HttpRequestOptions): Promise<HttpResponse> {
    try {
      // In Tauri environment, we can invoke native Rust reqwest execution directly!
      const response = await invoke<HttpResponse>('execute_native_http', {
        request: {
          url: options.url,
          method: options.method,
          headers: Object.entries(options.headers).map(([key, value]) => ({
            id: crypto.randomUUID(),
            key,
            value,
            enabled: true,
          })),
          queryParams: [],
          body: options.body ? { mode: 'raw', raw: options.body.toString(), language: 'json' } : { mode: 'none' },
          auth: { type: 'none' },
          preRequestScript: '',
          testScript: '',
          orderIndex: 0,
        },
        variables: {},
      });

      return response;
    } catch (err: any) {
      return {
        statusCode: 0,
        statusText: 'Native Execution Error',
        headers: {},
        body: err?.toString() || 'Failed to execute native desktop request',
        sizeBytes: 0,
        timing: { totalDurationMs: 0 },
        timestamp: Date.now(),
      };
    }
  }
}
