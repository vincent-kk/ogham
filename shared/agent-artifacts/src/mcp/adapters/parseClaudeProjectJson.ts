import type { ClaudeProjectJsonParseResult } from "./adapterTypes.js";

export function parseClaudeProjectJson(
  source: string | null,
): ClaudeProjectJsonParseResult {
  if (source === null || source.trim().length === 0)
    return { ok: true, value: { root: {}, servers: {} } };

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return { ok: false, reason: "invalid .mcp.json JSON" };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
    return { ok: false, reason: ".mcp.json root must be an object" };

  const root = parsed as Readonly<Record<string, unknown>>;
  const rawServers = root.mcpServers;
  if (rawServers === undefined)
    return { ok: true, value: { root, servers: {} } };

  if (
    rawServers === null ||
    typeof rawServers !== "object" ||
    Array.isArray(rawServers)
  )
    return { ok: false, reason: ".mcp.json mcpServers must be an object" };

  return {
    ok: true,
    value: {
      root,
      servers: rawServers as Readonly<Record<string, unknown>>,
    },
  };
}
