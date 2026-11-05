import { PROJECT_ROOT_ARG_DESCRIPTION } from "@ogham/cross-platform";
import { z } from "zod";

/** MCP HTTP tool input contract; kept here so registration cannot fork validation. */
export const FetchInputSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  endpoint: z.string(),
  service: z.enum(["jira", "confluence"]).optional(),
  base_url: z.string().url().optional(),
  body: z.unknown().optional(),
  query_params: z.record(z.string()).optional(),
  expand: z.array(z.string()).optional(),
  headers: z.record(z.string()).optional(),
  accept_format: z.enum(["json", "raw"]).optional(),
  content_type: z.string().optional(),
  content_format: z.enum(["json", "markdown"]).optional(),
  save_to_path: z.string().optional(),
  project_root: z
    .string()
    .optional()
    .describe(PROJECT_ROOT_ARG_DESCRIPTION),
});

/** MCP authentication-check options; connectivity remains an explicit opt-in. */
export const AuthCheckInputSchema = z.object({
  connection_test: z.boolean().optional(),
});

/** MCP setup options; optional values preserve the handler defaults. */
export const SetupInputSchema = z.object({
  mode: z.enum(["new", "edit"]).optional(),
  prefill: z.record(z.unknown()).optional(),
});
