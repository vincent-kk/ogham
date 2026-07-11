import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";
import { readTree } from "../../fsx/readTree.js";
import type { FileMap } from "../../types/output.js";
import { tokenizeBody } from "./tokenizeBody.js";

/**
 * Migration tool: derive a host-neutral `definitions/` FileMap from a plugin's
 * currently committed Claude artifacts (the inverse of the Claude emit). Tool
 * names and `${CLAUDE_PLUGIN_ROOT}` are tokenized so the result round-trips.
 * Returns paths relative to `definitions/`.
 */
export function extractDefinitions(pkgDir: string): FileMap {
  const files: FileMap = new Map();
  const plugin = readJson(join(pkgDir, ".claude-plugin", "plugin.json"));
  const name = String(plugin.name);
  const mcp = readMcp(join(pkgDir, ".mcp.json"));

  files.set(
    "plugin.yaml",
    Buffer.from(stringify(pluginYaml(plugin, mcp)), "utf8"),
  );

  copyTree(files, join(pkgDir, "skills"), "skills", name, mcp.server);
  copyTree(
    files,
    join(pkgDir, "agents"),
    "agents",
    name,
    mcp.server,
    /* mdOnly */ true,
  );

  const hooksPath = join(pkgDir, "hooks", "hooks.json");
  if (existsSync(hooksPath))
    files.set(
      "hooks.json",
      Buffer.from(
        readFileSync(hooksPath, "utf8").replaceAll(
          "${CLAUDE_PLUGIN_ROOT}",
          "{{pluginRoot}}",
        ),
        "utf8",
      ),
    );

  return files;
}

interface McpExtract {
  server: string;
  entry: string;
  present: boolean;
  transport?: "stdio";
}

function pluginYaml(
  plugin: Record<string, unknown>,
  mcp: McpExtract,
): Record<string, unknown> {
  const y: Record<string, unknown> = {
    name: plugin.name,
    description: plugin.description,
  };
  if (plugin.keywords) y.keywords = plugin.keywords;
  if (plugin.author) y.author = plugin.author;
  if (plugin.license) y.license = plugin.license;
  if (plugin.repository) y.repository = plugin.repository;
  if (plugin.homepage) y.homepage = plugin.homepage;
  if (mcp.present)
    y.mcp = {
      server: mcp.server,
      entry: mcp.entry,
      ...(mcp.transport ? { transport: mcp.transport } : {}),
    };
  return y;
}

function readMcp(mcpPath: string): McpExtract {
  const fallback: McpExtract = {
    server: "tools",
    entry: "bridge/mcp-server.cjs",
    present: false,
  };
  if (!existsSync(mcpPath)) return fallback;
  const servers = (readJson(mcpPath).mcpServers ?? {}) as Record<
    string,
    { args?: string[]; type?: "stdio" }
  >;
  const key = Object.keys(servers)[0];
  if (!key) return fallback;
  const arg0 = servers[key].args?.[0] ?? "bridge/mcp-server.cjs";
  return {
    server: key,
    entry: arg0.replace("${CLAUDE_PLUGIN_ROOT}/", ""),
    present: true,
    transport: servers[key].type,
  };
}

function copyTree(
  files: FileMap,
  dir: string,
  prefix: string,
  name: string,
  server: string,
  mdOnly = false,
): void {
  for (const [rel, bytes] of readTree(dir, dir)) {
    if (mdOnly && !rel.endsWith(".md")) continue;
    const out = rel.endsWith(".md")
      ? Buffer.from(tokenizeBody(bytes.toString("utf8"), name, server), "utf8")
      : bytes;
    files.set(`${prefix}/${rel}`, out);
  }
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8"));
}
