import {
  AuthConfig,
  HttpMethod,
  KeyValueParam,
  RequestBody,
  RequestItem,
} from '@postty/contracts';

export interface ParsedCurlResult {
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValueParam[];
  queryParams: KeyValueParam[];
  body: RequestBody;
  auth: AuthConfig;
}

/**
 * Tokenize a shell command string, taking into account single and double quotes and escapes.
 */
export function tokenizeShellArgs(commandStr: string): string[] {
  // Join multiline backslash linebreaks
  const cleaned = commandStr.replace(/\\\r?\n/g, ' ').trim();
  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escapeNext = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\' && !inSingleQuote) {
      escapeNext = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parse a cURL command string into Postty request attributes.
 */
export function parseCurlCommand(rawCurl: string, collectionId?: string): ParsedCurlResult {
  const tokens = tokenizeShellArgs(rawCurl);

  let method: HttpMethod = 'GET';
  let methodExplicitlySet = false;
  let rawUrl = '';
  const headers: KeyValueParam[] = [];
  const queryParams: KeyValueParam[] = [];
  let dataRaw: string | null = null;
  let auth: AuthConfig = { type: 'inherit' };

  // Skip leading "curl" token if present
  let startIndex = 0;
  if (tokens[0] && tokens[0].toLowerCase() === 'curl') {
    startIndex = 1;
  }

  for (let i = startIndex; i < tokens.length; i++) {
    const token = tokens[i];

    // -X or --request
    if (token === '-X' || token === '--request') {
      const next = tokens[++i];
      if (next) {
        method = next.toUpperCase() as HttpMethod;
        methodExplicitlySet = true;
      }
      continue;
    }
    if (token.startsWith('--request=')) {
      method = token.slice('--request='.length).toUpperCase() as HttpMethod;
      methodExplicitlySet = true;
      continue;
    }

    // -H or --header
    if (token === '-H' || token === '--header') {
      const headerStr = tokens[++i];
      if (headerStr) {
        parseAndAddHeader(headerStr, headers);
      }
      continue;
    }
    if (token.startsWith('--header=')) {
      parseAndAddHeader(token.slice('--header='.length), headers);
      continue;
    }

    // Data payload: -d, --data, --data-raw, --data-binary, --data-urlencode
    if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-urlencode'
    ) {
      const dataStr = tokens[++i];
      if (dataStr !== undefined) {
        dataRaw = dataRaw !== null ? `${dataRaw}&${dataStr}` : dataStr;
        if (!methodExplicitlySet && method === 'GET') {
          method = 'POST';
        }
      }
      continue;
    }
    if (token.startsWith('--data=')) {
      const dataStr = token.slice('--data='.length);
      dataRaw = dataRaw !== null ? `${dataRaw}&${dataStr}` : dataStr;
      if (!methodExplicitlySet && method === 'GET') {
        method = 'POST';
      }
      continue;
    }

    // Basic Auth: -u or --user (username:password)
    if (token === '-u' || token === '--user') {
      const userPass = tokens[++i];
      if (userPass) {
        const [username, ...rest] = userPass.split(':');
        auth = {
          type: 'basic',
          username,
          password: rest.join(':'),
        };
      }
      continue;
    }
    if (token.startsWith('--user=')) {
      const userPass = token.slice('--user='.length);
      const [username, ...rest] = userPass.split(':');
      auth = {
        type: 'basic',
        username,
        password: rest.join(':'),
      };
      continue;
    }

    // User-Agent: -A or --user-agent
    if (token === '-A' || token === '--user-agent') {
      const ua = tokens[++i];
      if (ua) {
        headers.push({
          id: crypto.randomUUID(),
          key: 'User-Agent',
          value: ua,
          enabled: true,
        });
      }
      continue;
    }

    // Explicit URL flag: --url
    if (token === '--url') {
      rawUrl = tokens[++i] || '';
      continue;
    }

    // Unrecognized flag (starts with -)
    if (token.startsWith('-')) {
      // Check if it's an option that takes an argument we should skip
      if (
        ['-o', '--output', '-m', '--max-time', '--connect-timeout', '-e', '--referer', '-cacert'].includes(token)
      ) {
        i++; // skip next token
      }
      continue;
    }

    // Positional argument -> URL (if not set yet)
    if (!rawUrl && (token.startsWith('http://') || token.startsWith('https://') || token.includes('/') || token.includes('.'))) {
      rawUrl = token;
    }
  }

  // Parse URL and extract query params
  let cleanUrl = rawUrl;
  if (rawUrl) {
    try {
      const parsedUrl = new URL(rawUrl);
      parsedUrl.searchParams.forEach((val, key) => {
        queryParams.push({
          id: crypto.randomUUID(),
          key,
          value: val,
          enabled: true,
        });
      });
      // Set cleanUrl without query params to avoid duplicate params in buildUrl
      cleanUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
    } catch {
      // Relative or templated URL with query string
      const qIndex = rawUrl.indexOf('?');
      if (qIndex !== -1) {
        cleanUrl = rawUrl.slice(0, qIndex);
        const searchParams = new URLSearchParams(rawUrl.slice(qIndex + 1));
        searchParams.forEach((val, key) => {
          queryParams.push({
            id: crypto.randomUUID(),
            key,
            value: val,
            enabled: true,
          });
        });
      }
    }
  }

  // Check Authorization header for Bearer / Basic
  const authHeaderIdx = headers.findIndex((h) => h.key.toLowerCase() === 'authorization');
  if (authHeaderIdx !== -1 && auth.type === 'inherit') {
    const authVal = headers[authHeaderIdx].value.trim();
    if (authVal.toLowerCase().startsWith('bearer ')) {
      auth = {
        type: 'bearer',
        token: authVal.slice(7).trim(),
      };
      // Keep or remove authorization header
      headers.splice(authHeaderIdx, 1);
    }
  }

  // Build RequestBody
  let body: RequestBody = { mode: 'none' };
  if (dataRaw !== null) {
    const contentTypeHeader = headers.find((h) => h.key.toLowerCase() === 'content-type');
    const ct = contentTypeHeader?.value.toLowerCase() || '';

    if (ct.includes('application/x-www-form-urlencoded')) {
      const urlencoded: KeyValueParam[] = [];
      const searchParams = new URLSearchParams(dataRaw);
      searchParams.forEach((val, key) => {
        urlencoded.push({
          id: crypto.randomUUID(),
          key,
          value: val,
          enabled: true,
        });
      });
      body = {
        mode: 'urlencoded',
        urlencoded,
      };
    } else {
      let isJson = ct.includes('application/json');
      if (!isJson && (dataRaw.trim().startsWith('{') || dataRaw.trim().startsWith('['))) {
        try {
          JSON.parse(dataRaw);
          isJson = true;
        } catch {
          // not valid json
        }
      }

      body = {
        mode: 'raw',
        raw: dataRaw,
        language: isJson ? 'json' : 'text',
      };
    }
  }

  // Derive request name from URL
  let name = `${method} Request`;
  if (cleanUrl) {
    try {
      const u = new URL(cleanUrl);
      const parts = u.pathname.split('/').filter(Boolean);
      name = parts.length > 0 ? `${method} /${parts.join('/')}` : `${method} ${u.host}`;
    } catch {
      name = `${method} ${cleanUrl}`;
    }
  }

  return {
    name,
    method,
    url: cleanUrl || rawUrl,
    headers,
    queryParams,
    body,
    auth,
  };
}

/**
 * Helper to parse "Header-Name: Value" and add to headers list
 */
function parseAndAddHeader(headerStr: string, headers: KeyValueParam[]): void {
  const colonIndex = headerStr.indexOf(':');
  if (colonIndex !== -1) {
    const key = headerStr.slice(0, colonIndex).trim();
    const value = headerStr.slice(colonIndex + 1).trim();
    headers.push({
      id: crypto.randomUUID(),
      key,
      value,
      enabled: true,
    });
  } else {
    headers.push({
      id: crypto.randomUUID(),
      key: headerStr.trim(),
      value: '',
      enabled: true,
    });
  }
}

/**
 * Convert cURL command directly into a full Postty RequestItem
 */
export function curlToRequestItem(
  rawCurl: string,
  collectionId: string,
  folderId: string | null = null
): RequestItem {
  const parsed = parseCurlCommand(rawCurl, collectionId);
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    collectionId,
    folderId,
    name: parsed.name,
    method: parsed.method,
    url: parsed.url,
    headers: parsed.headers,
    queryParams: parsed.queryParams,
    body: parsed.body,
    auth: parsed.auth,
    preRequestScript: '',
    testScript: '',
    orderIndex: 0,
    createdAt: now,
    updatedAt: now,
  };
}
