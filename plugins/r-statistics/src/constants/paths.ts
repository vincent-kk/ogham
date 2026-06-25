import { homedir } from "node:os";
import { join } from "node:path";

function claudeRoot(): string {
  return process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
}

export const R_STATISTICS_HOME = join(
  claudeRoot(),
  "plugins",
  "r-statistics",
);
export const CONFIG_PATH = join(R_STATISTICS_HOME, "config.json");
export const RUNTIME_DIR = join(R_STATISTICS_HOME, "runtime");
export const WORKSPACES_DIR = join(RUNTIME_DIR, "workspaces");

export function workspaceDir(workspaceId: string): string {
  return join(WORKSPACES_DIR, workspaceId);
}

export function workspaceArtifactsDir(workspaceId: string): string {
  return join(workspaceDir(workspaceId), "artifacts");
}

export function workspaceDataDir(workspaceId: string): string {
  return join(workspaceDir(workspaceId), "data");
}

export function workspaceScriptPath(workspaceId: string): string {
  return join(workspaceDir(workspaceId), "script.R");
}

export function workspaceManifestPath(workspaceId: string): string {
  return join(workspaceArtifactsDir(workspaceId), "manifest.json");
}

export function workspaceMetaPath(workspaceId: string): string {
  return join(workspaceDir(workspaceId), "meta.json");
}

/**
 * Resolve the shipped R execution contract (shared/contract.R). CLAUDE_PLUGIN_ROOT
 * is set by the Claude Code plugin runtime to the plugin install directory.
 */
export function contractScriptPath(): string {
  const root = process.env.CLAUDE_PLUGIN_ROOT ?? R_STATISTICS_HOME;
  return join(root, "shared", "contract.R");
}
