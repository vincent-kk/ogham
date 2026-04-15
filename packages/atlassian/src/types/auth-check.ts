import { z } from 'zod';

// --- Service status (config-only, no credentials) ---

export const AuthCheckServiceStatusSchema = z.object({
  configured: z.boolean(),
  base_url: z.string().optional(),
});
export type AuthCheckServiceStatus = z.infer<typeof AuthCheckServiceStatusSchema>;

// --- Connection test result (added when connection_test: true) ---

export const AuthCheckConnectionStatusSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  latency_ms: z.number().optional(),
});
export type AuthCheckConnectionStatus = z.infer<typeof AuthCheckConnectionStatusSchema>;

// --- User info (Jira /myself only) ---

export const AuthCheckUserInfoSchema = z.object({
  displayName: z.string().optional(),
  emailAddress: z.string().optional(),
});
export type AuthCheckUserInfo = z.infer<typeof AuthCheckUserInfoSchema>;

// --- Per-service entry ---

export const AuthCheckServiceEntrySchema = AuthCheckServiceStatusSchema.extend({
  connection: AuthCheckConnectionStatusSchema.optional(),
  user: AuthCheckUserInfoSchema.nullable().optional(),
});
export type AuthCheckServiceEntry = z.infer<typeof AuthCheckServiceEntrySchema>;

// --- Top-level result (per-service is an array for multi-site) ---

export const AuthCheckResultSchema = z.object({
  authenticated: z.boolean(),
  services: z.object({
    jira: z.array(AuthCheckServiceEntrySchema).optional(),
    confluence: z.array(AuthCheckServiceEntrySchema).optional(),
  }),
});
export type AuthCheckResult = z.infer<typeof AuthCheckResultSchema>;
