import {
  AuthConfig,
  HttpResponse,
  RequestItem,
} from '@postty/contracts';
import { VariableInterpolator, VariableMap } from './interpolator.js';
import { FetchTransport, HttpRequestOptions, HttpTransport } from './transport.js';

export interface ExecuteOptions {
  request: RequestItem;
  variables?: VariableMap;
  parentAuth?: AuthConfig;
  transport?: HttpTransport;
  timeoutMs?: number;
}

export class RequestExecutor {
  private transport: HttpTransport;

  constructor(defaultTransport?: HttpTransport) {
    this.transport = defaultTransport ?? new FetchTransport();
  }

  public async execute(options: ExecuteOptions): Promise<HttpResponse> {
    const {
      request,
      variables = {},
      parentAuth,
      transport = this.transport,
      timeoutMs = 30000,
    } = options;

    // 1. Построение URL с интерполяцией и query-параметрами
    const finalUrl = this.buildUrl(request.url, request.queryParams, variables);

    // 2. Построение заголовков с учетом авторизации
    const finalHeaders = this.buildHeaders(
      request.headers,
      request.auth,
      parentAuth,
      variables
    );

    // 3. Построение тела запроса
    const { body, bodyContentType } = this.buildBody(request.body, variables);
    if (bodyContentType && !finalHeaders['content-type']) {
      finalHeaders['content-type'] = bodyContentType;
    }

    const requestOptions: HttpRequestOptions = {
      url: finalUrl,
      method: request.method,
      headers: finalHeaders,
      body,
      timeoutMs,
    };

    return await transport.execute(requestOptions);
  }

  private buildUrl(
    rawUrl: string,
    queryParams: RequestItem['queryParams'],
    variables: VariableMap
  ): string {
    const interpolatedBase = VariableInterpolator.interpolate(rawUrl, variables).trim();
    if (!interpolatedBase) {
      return '';
    }

    try {
      const url = new URL(interpolatedBase);
      for (const param of queryParams) {
        if (param.enabled && param.key) {
          const key = VariableInterpolator.interpolate(param.key, variables);
          const value = VariableInterpolator.interpolate(param.value, variables);
          url.searchParams.append(key, value);
        }
      }
      return url.toString();
    } catch {
      // Если URL относительный или шаблон не является полным URL
      const searchParams = new URLSearchParams();
      for (const param of queryParams) {
        if (param.enabled && param.key) {
          const key = VariableInterpolator.interpolate(param.key, variables);
          const value = VariableInterpolator.interpolate(param.value, variables);
          searchParams.append(key, value);
        }
      }
      const qs = searchParams.toString();
      if (!qs) return interpolatedBase;
      return interpolatedBase.includes('?')
        ? `${interpolatedBase}&${qs}`
        : `${interpolatedBase}?${qs}`;
    }
  }

  private buildHeaders(
    headersList: RequestItem['headers'],
    auth: RequestItem['auth'],
    parentAuth: AuthConfig | undefined,
    variables: VariableMap
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    // Пользовательские заголовки
    for (const h of headersList) {
      if (h.enabled && h.key) {
        const key = VariableInterpolator.interpolate(h.key, variables).trim().toLowerCase();
        const value = VariableInterpolator.interpolate(h.value, variables);
        headers[key] = value;
      }
    }

    // Разрешение типа авторизации (inherit -> parentAuth)
    const effectiveAuth = auth.type === 'inherit' && parentAuth ? parentAuth : auth;

    if (effectiveAuth.type === 'bearer' && effectiveAuth.token) {
      const token = VariableInterpolator.interpolate(effectiveAuth.token, variables);
      headers['authorization'] = `Bearer ${token}`;
    } else if (effectiveAuth.type === 'basic') {
      const user = VariableInterpolator.interpolate(effectiveAuth.username, variables);
      const pass = VariableInterpolator.interpolate(effectiveAuth.password, variables);
      const rawCreds = `${user}:${pass}`;
      const credentials = typeof btoa === 'function'
        ? btoa(rawCreds)
        : (globalThis as any).Buffer
          ? (globalThis as any).Buffer.from(rawCreds).toString('base64')
          : '';
      headers['authorization'] = `Basic ${credentials}`;
    } else if (effectiveAuth.type === 'apiKey' && effectiveAuth.addTo === 'header' && effectiveAuth.key) {
      const key = VariableInterpolator.interpolate(effectiveAuth.key, variables).trim().toLowerCase();
      const value = VariableInterpolator.interpolate(effectiveAuth.value, variables);
      headers[key] = value;
    }

    return headers;
  }

  private buildBody(
    bodyConfig: RequestItem['body'],
    variables: VariableMap
  ): { body?: string; bodyContentType?: string } {
    if (!bodyConfig || bodyConfig.mode === 'none') {
      return {};
    }

    if (bodyConfig.mode === 'raw') {
      const interpolated = VariableInterpolator.interpolate(bodyConfig.raw, variables);
      let contentType = 'text/plain';
      if (bodyConfig.language === 'json') contentType = 'application/json';
      else if (bodyConfig.language === 'xml') contentType = 'application/xml';
      else if (bodyConfig.language === 'html') contentType = 'text/html';
      else if (bodyConfig.language === 'javascript') contentType = 'application/javascript';

      return { body: interpolated, bodyContentType: contentType };
    }

    if (bodyConfig.mode === 'urlencoded') {
      const params = new URLSearchParams();
      for (const item of bodyConfig.urlencoded) {
        if (item.enabled && item.key) {
          const key = VariableInterpolator.interpolate(item.key, variables);
          const val = VariableInterpolator.interpolate(item.value, variables);
          params.append(key, val);
        }
      }
      return {
        body: params.toString(),
        bodyContentType: 'application/x-www-form-urlencoded',
      };
    }

    return {};
  }
}
