import type { McpServerDefinition } from "../../types/mcp.js";

export function toCodexProjectDefinition(
  definition: McpServerDefinition,
): Readonly<Record<string, unknown>> {
  if (definition.transport === "stdio")
    return {
      command: definition.command,
      ...(definition.args === undefined ? {} : { args: [...definition.args] }),
      ...(definition.env === undefined ? {} : { env: { ...definition.env } }),
    };
  return {
    url: definition.url,
    ...(definition.bearerTokenEnvVar === undefined
      ? {}
      : { bearer_token_env_var: definition.bearerTokenEnvVar }),
    ...(definition.headers === undefined
      ? {}
      : { http_headers: { ...definition.headers } }),
  };
}
