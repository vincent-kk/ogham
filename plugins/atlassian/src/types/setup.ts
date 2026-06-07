import { z } from "zod";
import type { ServiceCredentials } from "./config.js";

// --- Deployment type ---

export const DeploymentTypeSchema = z.enum(["cloud", "onprem"]);
export type DeploymentType = z.infer<typeof DeploymentTypeSchema>;

// --- Service form fields ---

const ServiceFieldsBase = z.object({
  base_url: z.string().url(),
  ssl_verify: z.boolean().nullable().optional(),
  timeout: z.number().int().positive().nullable().optional(),
  api_version_override: z.enum(["2", "3"]).optional(),
});

// --- Credential fields (form submission) ---

const FormCredentialsSchema = z.object({
  api_token: z.string().optional(),
  password: z.string().optional(),
});

const CloudServiceFields = ServiceFieldsBase.merge(FormCredentialsSchema).merge(
  z.object({ username: z.string().min(1) }),
);

const OnPremServiceFields = ServiceFieldsBase.merge(
  FormCredentialsSchema,
).merge(z.object({ username: z.string().optional() }));

// --- Setup form data (discriminated by deployment_type) ---

const CloudFormSchema = z.object({
  deployment_type: z.literal("cloud"),
  jira: CloudServiceFields.optional(),
  confluence: CloudServiceFields.optional(),
});

const OnPremFormSchema = z.object({
  deployment_type: z.literal("onprem"),
  jira: OnPremServiceFields.optional(),
  confluence: OnPremServiceFields.optional(),
});

export const SetupFormDataSchema = z.discriminatedUnion("deployment_type", [
  CloudFormSchema,
  OnPremFormSchema,
]);
export type SetupFormData = z.infer<typeof SetupFormDataSchema>;

// --- Response schemas ---

export const SetupResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  errors: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});
export type SetupResponse = z.infer<typeof SetupResponseSchema>;

// --- Status schema ---

export const SetupStatusSchema = z.object({
  configured: z.boolean(),
  deployment_type: DeploymentTypeSchema.optional(),
  jira: z
    .array(
      z.object({
        base_url: z.string(),
        is_cloud: z.boolean(),
      }),
    )
    .optional(),
  confluence: z
    .array(
      z.object({
        base_url: z.string(),
        is_cloud: z.boolean(),
      }),
    )
    .optional(),
});
export type SetupStatus = z.infer<typeof SetupStatusSchema>;

// --- Test connection params ---

export interface TestConnectionParams {
  base_url: string;
  credentials: ServiceCredentials;
  username?: string;
  service: "jira" | "confluence";
  include_body?: boolean;
  api_version_override?: "2" | "3";
}

// --- Setup tool params ---

export interface SetupParams {
  mode?: "new" | "edit";
}

export interface SetupResult {
  success: boolean;
  message: string;
  url?: string;
}

// --- Connection test result ---

export const ConnectionTestResultSchema = z.object({
  service: z.enum(["jira", "confluence"]),
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
