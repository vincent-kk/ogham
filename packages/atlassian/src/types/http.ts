import { z } from 'zod';

export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const HttpRequestSchema = z.object({
  method: HttpMethodSchema,
  url: z.string(),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  timeout: z.number().optional(),
});
export type HttpRequest = z.infer<typeof HttpRequestSchema>;

export const HttpResponseSchema = z.object({
  status: z.number(),
  headers: z.record(z.string()),
  body: z.unknown(),
});
export type HttpResponse = z.infer<typeof HttpResponseSchema>;

export const McpErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
  reauth_required: z.boolean().optional(),
  details: z.unknown().optional(),
});
export type McpError = z.infer<typeof McpErrorSchema>;

export const PaginationSchema = z.object({
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
  startAt: z.number().optional(),
  total: z.number().optional(),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const McpResponseSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  data: z.unknown(),
  error: McpErrorSchema.optional(),
  pagination: PaginationSchema.optional(),
});
export type McpResponse = z.infer<typeof McpResponseSchema>;

// --- HTTP client config (internal, no runtime validation needed) ---

export interface HttpClientConfig {
  base_url: string;
  auth_header?: string;
  ssl_verify?: boolean;
  timeout?: number;
}

export interface RequestOptions {
  method: HttpMethod;
  endpoint: string;
  body?: unknown;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  timeout?: number;
  acceptBinary?: boolean;
}
