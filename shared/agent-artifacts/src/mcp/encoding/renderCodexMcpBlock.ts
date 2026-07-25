import type { McpServerDefinition } from "../../types/mcp.js";
import type { CodexMcpBlockMarkers } from "./codexMcpBlockMarkers.js";

export function renderCodexMcpBlock(options: {
  readonly markers: CodexMcpBlockMarkers;
  readonly name: string;
  readonly definition: McpServerDefinition;
}): string {
  const quotedName = JSON.stringify(options.name);
  const definition = options.definition;
  const lines = [options.markers.start, `[mcp_servers.${quotedName}]`];
  if (definition.transport === "stdio") {
    lines.push(`command = ${JSON.stringify(definition.command)}`);
    if (definition.args !== undefined)
      lines.push(
        `args = [${definition.args.map((value) => JSON.stringify(value)).join(", ")}]`,
      );
    if (definition.env !== undefined)
      lines.push(
        `env = { ${Object.entries(definition.env)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(
            ([key, value]) =>
              `${JSON.stringify(key)} = ${JSON.stringify(value)}`,
          )
          .join(", ")} }`,
      );
  } else {
    lines.push(`url = ${JSON.stringify(definition.url)}`);
    if (definition.bearerTokenEnvVar !== undefined)
      lines.push(
        `bearer_token_env_var = ${JSON.stringify(definition.bearerTokenEnvVar)}`,
      );
    if (definition.headers !== undefined)
      lines.push(
        `http_headers = { ${Object.entries(definition.headers)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(
            ([key, value]) =>
              `${JSON.stringify(key)} = ${JSON.stringify(value)}`,
          )
          .join(", ")} }`,
      );
  }
  lines.push(options.markers.end);
  return `${lines.join("\n")}\n`;
}
