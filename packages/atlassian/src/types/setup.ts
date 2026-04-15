import { z } from 'zod';
import type { ServiceCredentials } from './config.js';

// --- Deployment type ---

export const DeploymentTypeSchema = z.enum(['cloud', 'onprem']);
export type DeploymentType = z.infer<typeof DeploymentTypeSchema>;

// --- Service form fields ---

const ServiceFormFieldsSchema = z.object({
  base_url: z.string().url(),
  username: z.string().optional(),
  ssl_verify: z.boolean().nullable().optional(),
  timeout: z.number().int().positive().nullable().optional(),
});

// --- Credential fields (form submission) ---

const FormCredentialsSchema = z.object({
  api_token: z.string().optional(),
  password: z.string().optional(),
});

// --- Setup form data ---

export const SetupFormDataSchema = z.object({
  deployment_type: DeploymentTypeSchema,
  // Cloud: multiple sites (array of URLs)
  // On-premise: separate jira/confluence
  jira: ServiceFormFieldsSchema.merge(FormCredentialsSchema).optional(),
  confluence: ServiceFormFieldsSchema.merge(FormCredentialsSchema).optional(),
});
export type SetupFormData = z.infer<typeof SetupFormDataSchema>;

// --- Response schemas ---

export const SetupResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
});
export type SetupResponse = z.infer<typeof SetupResponseSchema>;

// --- Status schema ---

export const SetupStatusSchema = z.object({
  configured: z.boolean(),
  deployment_type: DeploymentTypeSchema.optional(),
  jira: z.array(z.object({
    base_url: z.string(),
    is_cloud: z.boolean(),
  })).optional(),
  confluence: z.array(z.object({
    base_url: z.string(),
    is_cloud: z.boolean(),
  })).optional(),
});
export type SetupStatus = z.infer<typeof SetupStatusSchema>;

// --- Test connection params ---

export interface TestConnectionParams {
  base_url: string;
  credentials: ServiceCredentials;
  username?: string;
  service: 'jira' | 'confluence';
  include_body?: boolean;
}

// --- Setup tool params ---

export interface SetupParams {
  mode?: 'new' | 'edit';
}

export interface SetupResult {
  success: boolean;
  message: string;
  url?: string;
}

// --- Connection test result ---

export const ConnectionTestResultSchema = z.object({
  service: z.enum(['jira', 'confluence']),
  success: z.boolean(),
  message: z.string(),
  latency_ms: z.number().optional(),
  response_body: z.unknown().optional(),
});
export type ConnectionTestResult = z.infer<typeof ConnectionTestResultSchema>;

// --- Server handle (closure return) ---

export interface SetupServerHandle {
  url: string;
  close: () => Promise<void>;
}
