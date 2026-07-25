import type { McpServerRequest } from "../../types/mcp.js";

export function buildClaudeUserArguments(
  request: McpServerRequest,
): readonly string[] {
  const definition = request.definition;
  if (definition === null)
    return ["mcp", "remove", "--scope", "user", request.name];

  if (definition.transport === "stdio")
    return [
      "mcp",
      "add",
      "--scope",
      "user",
      ...Object.entries(definition.env ?? {})
        .sort(([left], [right]) => left.localeCompare(right))
        .flatMap(([key, value]) => ["--env", `${key}=${value}`]),
      request.name,
      "--",
      definition.command,
      ...(definition.args ?? []),
    ];

  return [
    "mcp",
    "add",
    "--scope",
    "user",
    "--transport",
    "http",
    ...Object.entries(definition.headers ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([key, value]) => ["--header", `${key}: ${value}`]),
    request.name,
    definition.url,
  ];
}
