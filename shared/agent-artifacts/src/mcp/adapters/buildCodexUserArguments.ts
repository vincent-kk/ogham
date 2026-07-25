import type { McpServerRequest } from "../../types/mcp.js";

export function buildCodexUserArguments(
  request: McpServerRequest,
): readonly string[] {
  const definition = request.definition;
  if (definition === null) return ["mcp", "remove", request.name];

  if (definition.transport === "stdio")
    return [
      "mcp",
      "add",
      request.name,
      ...Object.entries(definition.env ?? {})
        .sort(([left], [right]) => left.localeCompare(right))
        .flatMap(([key, value]) => ["--env", `${key}=${value}`]),
      "--",
      definition.command,
      ...(definition.args ?? []),
    ];

  return [
    "mcp",
    "add",
    request.name,
    "--url",
    definition.url,
    ...(definition.bearerTokenEnvVar === undefined
      ? []
      : ["--bearer-token-env-var", definition.bearerTokenEnvVar]),
  ];
}
