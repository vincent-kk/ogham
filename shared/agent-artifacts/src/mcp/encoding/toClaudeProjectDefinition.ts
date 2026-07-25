import type { McpServerDefinition } from "../../types/mcp.js";

export function toClaudeProjectDefinition(
  definition: McpServerDefinition,
): Readonly<Record<string, unknown>> {
  if (definition.transport === "stdio")
    return {
      command: definition.command,
      ...(definition.args === undefined ? {} : { args: [...definition.args] }),
      ...(definition.env === undefined ? {} : { env: { ...definition.env } }),
    };
  return {
    type: "http",
    url: definition.url,
    ...(definition.headers === undefined
      ? {}
      : { headers: { ...definition.headers } }),
  };
}
