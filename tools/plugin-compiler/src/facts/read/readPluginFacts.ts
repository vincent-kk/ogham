import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CLAUDE_HOOKS_PATH,
  CLAUDE_MANIFEST_PATH,
  CLAUDE_MCP_PATH,
  SKILLS_DIRECTORY,
} from "../../constants/hosts.js";
import type {
  HooksFileSource,
  McpServerSource,
  PluginFacts,
} from "../../types/adapter.js";

/** Reads one plugin's Claude artifacts (read-only) into adapter-input facts. */
export function readPluginFacts(directory: string): PluginFacts {
  const manifestPath = join(directory, CLAUDE_MANIFEST_PATH);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
    string,
    unknown
  >;
  const name = manifest.name;
  if (typeof name !== "string" || !name)
    throw new Error(`plugin manifest has no name: ${manifestPath}`);

  const hooksPath = join(directory, CLAUDE_HOOKS_PATH);
  const hasHooks = existsSync(hooksPath);
  const hooksFile = hasHooks
    ? (JSON.parse(readFileSync(hooksPath, "utf8")) as HooksFileSource)
    : null;

  const mcpPath = join(directory, CLAUDE_MCP_PATH);
  const mcpServers = existsSync(mcpPath)
    ? ((
        JSON.parse(readFileSync(mcpPath, "utf8")) as {
          mcpServers?: Record<string, McpServerSource>;
        }
      ).mcpServers ?? null)
    : null;

  return {
    directory,
    name,
    manifest,
    hasSkills: existsSync(join(directory, SKILLS_DIRECTORY)),
    hasHooks,
    hooksFile,
    mcpServers,
  };
}
