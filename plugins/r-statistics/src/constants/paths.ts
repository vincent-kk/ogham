import { homedir } from "node:os";
import { join } from "node:path";

import { pluginRoot, projectRoot } from "@ogham/cross-platform/host-paths";

function claudeRoot(): string {
  return process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
}

export const R_STATISTICS_HOME = join(claudeRoot(), "plugins", "r-statistics");
export const CONFIG_PATH = join(R_STATISTICS_HOME, "config.json");
export const RUNTIME_DIR = join(R_STATISTICS_HOME, "runtime");
export const WORKSPACES_DIR = join(RUNTIME_DIR, "workspaces");
export const MANAGED_R_LIB_DIR = join(RUNTIME_DIR, "r-lib");

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
 * Resolve the shipped R execution contract (shared/contract.R) inside the plugin's
 * install directory, falling back to the conventional home when the host exposes
 * neither an env var nor a usable cwd.
 */
export function contractScriptPath(): string {
  const root = pluginRoot() ?? R_STATISTICS_HOME;
  return join(root, "shared", "contract.R");
}

/**
 * Allow-root every run_r input dataset path must resolve under (symlinks
 * included; enforced in resolveDataRefs). Defaults to the user's workspace, where
 * their data lives; off Claude that has to be supplied as run_r's `project_root`
 * (projectRoot throws otherwise rather than pointing the allow-root at the plugin
 * folder). Override with R_STATISTICS_DATA_ROOT to point at a dedicated dir.
 */
export function inputDataRoot(): string {
  return process.env.R_STATISTICS_DATA_ROOT ?? projectRoot();
}
