import type { McpServerRequest } from "../../types/mcp.js";
import { hasAsciiControlCharacter } from "../../validation/index.js";

export type McpAdapterFlavor =
  "claude-project" | "claude-user" | "codex-project" | "codex-user";

export function validateMcpRequest(
  request: McpServerRequest,
  flavor: McpAdapterFlavor,
): string | null {
  if (
    request.name.length === 0 ||
    request.name.length > 256 ||
    request.name.startsWith("-") ||
    hasAsciiControlCharacter(request.name, "all")
  )
    return "MCP server name is invalid";
  const definition = request.definition;
  if (definition === null) return null;
  if (definition.transport === "stdio") {
    if (
      definition.command.length === 0 ||
      hasAsciiControlCharacter(definition.command, "line")
    )
      return "stdio command is invalid";
    if (
      definition.args?.some(
        (argument) => typeof argument !== "string" || argument.includes("\0"),
      )
    )
      return "stdio argument is invalid";
    if (
      Object.entries(definition.env ?? {}).some(
        ([key, value]) =>
          key.length === 0 ||
          key.includes("=") ||
          hasAsciiControlCharacter(key, "line") ||
          typeof value !== "string" ||
          value.includes("\0"),
      )
    )
      return "stdio environment is invalid";
    return null;
  }
  let protocol: string;
  try {
    protocol = new URL(definition.url).protocol;
  } catch {
    return "HTTP URL is invalid";
  }
  if (protocol !== "http:" && protocol !== "https:")
    return "HTTP URL must use http or https";

  if (
    definition.bearerTokenEnvVar !== undefined &&
    (definition.bearerTokenEnvVar.length === 0 ||
      definition.bearerTokenEnvVar.includes("=") ||
      hasAsciiControlCharacter(definition.bearerTokenEnvVar, "line"))
  )
    return "bearer token environment variable is invalid";
  if (
    Object.entries(definition.headers ?? {}).some(
      ([key, value]) =>
        key.length === 0 ||
        hasAsciiControlCharacter(key, "all") ||
        typeof value !== "string" ||
        hasAsciiControlCharacter(value, "line"),
    )
  )
    return "HTTP header is invalid";
  if (
    (flavor === "claude-project" || flavor === "claude-user") &&
    definition.bearerTokenEnvVar !== undefined
  )
    return "Claude adapters do not support bearerTokenEnvVar";
  if (
    flavor === "codex-user" &&
    Object.keys(definition.headers ?? {}).length > 0
  )
    return "Codex user CLI does not support literal HTTP headers";
  return null;
}
