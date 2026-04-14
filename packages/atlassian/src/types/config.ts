import { z } from 'zod';

export const AuthTypeSchema = z.enum(['basic', 'pat', 'oauth']);
export type AuthType = z.infer<typeof AuthTypeSchema>;

export const ServiceConfigSchema = z.object({
  base_url: z.string().url(),
  auth_type: AuthTypeSchema,
  username: z.string().optional(),
  is_cloud: z.boolean().default(true),
  ssl_verify: z.boolean().default(true),
  timeout: z.number().int().positive().default(30000),
});
export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

export const AtlassianConfigSchema = z.object({
  $schema: z.string().optional(),
  jira: ServiceConfigSchema.optional(),
  confluence: ServiceConfigSchema.optional(),
});
export type AtlassianConfig = z.infer<typeof AtlassianConfigSchema>;

export const BasicCredentialSchema = z.object({
  api_token: z.string().optional(),
  password: z.string().optional(),
});

export const PatCredentialSchema = z.object({
  personal_token: z.string(),
});

export const OAuthCredentialSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_at: z.number().optional(),
});

export const ServiceCredentialsSchema = z.object({
  basic: BasicCredentialSchema.optional(),
  pat: PatCredentialSchema.optional(),
  oauth: OAuthCredentialSchema.optional(),
});
export type ServiceCredentials = z.infer<typeof ServiceCredentialsSchema>;

export const CredentialsSchema = z.object({
  jira: ServiceCredentialsSchema.optional(),
  confluence: ServiceCredentialsSchema.optional(),
});
export type Credentials = z.infer<typeof CredentialsSchema>;

export const ConnectionInfoSchema = z.object({
  config: AtlassianConfigSchema,
  credentials: CredentialsSchema,
});
export type ConnectionInfo = z.infer<typeof ConnectionInfoSchema>;
