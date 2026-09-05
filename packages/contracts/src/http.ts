import { z } from 'zod';

export const HttpMethodSchema = z.enum([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const KeyValueParamSchema = z.object({
  id: z.string().uuid().default(() => crypto.randomUUID()),
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
});
export type KeyValueParam = z.infer<typeof KeyValueParamSchema>;

export const AuthConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('none'),
  }),
  z.object({
    type: z.literal('bearer'),
    token: z.string(),
  }),
  z.object({
    type: z.literal('basic'),
    username: z.string(),
    password: z.string(),
  }),
  z.object({
    type: z.literal('apiKey'),
    key: z.string(),
    value: z.string(),
    addTo: z.enum(['header', 'query']).default('header'),
  }),
  z.object({
    type: z.literal('oauth2'),
    grantType: z.enum(['authorization_code', 'client_credentials', 'password']),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
  }),
  z.object({
    type: z.literal('inherit'),
  }),
]);
export type AuthConfig = z.infer<typeof AuthConfigSchema>;

export const RequestBodySchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('none'),
  }),
  z.object({
    mode: z.literal('raw'),
    raw: z.string(),
    language: z.enum(['json', 'xml', 'html', 'text', 'javascript']).default('json'),
  }),
  z.object({
    mode: z.literal('form-data'),
    formData: z.array(
      z.object({
        id: z.string().uuid().default(() => crypto.randomUUID()),
        key: z.string(),
        value: z.string(),
        type: z.enum(['text', 'file']).default('text'),
        enabled: z.boolean().default(true),
      })
    ),
  }),
  z.object({
    mode: z.literal('urlencoded'),
    urlencoded: z.array(KeyValueParamSchema),
  }),
]);
export type RequestBody = z.infer<typeof RequestBodySchema>;

export const ResponseTimingSchema = z.object({
  dnsLookupMs: z.number().optional(),
  tcpConnectionMs: z.number().optional(),
  tlsHandshakeMs: z.number().optional(),
  firstByteMs: z.number().optional(),
  totalDurationMs: z.number(),
});
export type ResponseTiming = z.infer<typeof ResponseTimingSchema>;

export const HttpResponseSchema = z.object({
  statusCode: z.number(),
  statusText: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.string(),
  contentType: z.string().optional(),
  sizeBytes: z.number(),
  timing: ResponseTimingSchema,
  timestamp: z.number(),
});
export type HttpResponse = z.infer<typeof HttpResponseSchema>;
