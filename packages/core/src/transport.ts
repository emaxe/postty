import { HttpResponse } from '@postty/contracts';

export interface HttpRequestOptions {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | FormData | URLSearchParams;
  timeoutMs?: number;
}

export interface HttpTransport {
  execute(options: HttpRequestOptions): Promise<HttpResponse>;
}

export class FetchTransport implements HttpTransport {
  public async execute(options: HttpRequestOptions): Promise<HttpResponse> {
    const startTime = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, options.timeoutMs ?? 30000);

    try {
      const response = await fetch(options.url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
        signal: controller.signal,
      });

      const responseText = await response.text();
      const endTime = performance.now();

      const headersRecord: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        headersRecord[key.toLowerCase()] = val;
      });

      const sizeBytes = new TextEncoder().encode(responseText).length;

      return {
        statusCode: response.status,
        statusText: response.statusText,
        headers: headersRecord,
        body: responseText,
        contentType: response.headers.get('content-type') ?? undefined,
        sizeBytes,
        timing: {
          totalDurationMs: Math.round(endTime - startTime),
        },
        timestamp: Date.now(),
      };
    } catch (err: any) {
      const endTime = performance.now();
      const isAbort = err.name === 'AbortError';

      return {
        statusCode: isAbort ? 408 : 0,
        statusText: isAbort ? 'Request Timeout' : (err.message || 'Network Error'),
        headers: {},
        body: err.stack || err.message || 'Network request failed',
        sizeBytes: 0,
        timing: {
          totalDurationMs: Math.round(endTime - startTime),
        },
        timestamp: Date.now(),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
