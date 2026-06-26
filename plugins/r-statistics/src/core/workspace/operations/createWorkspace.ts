import { mkdir, rm } from "node:fs/promises";

import { DIR_MODE } from "../../../constants/defaults.js";
import { ERROR_MESSAGES } from "../../../constants/messages.js";
import {
  workspaceArtifactsDir,
  workspaceDataDir,
  workspaceDir,
} from "../../../constants/paths.js";
import { randomId } from "../../../utils/randomId.js";

export interface WorkspaceHandle {
  workspaceId: string;
  dir: string;
  artifactsDir: string;
  dataDir: string;
}

export interface CreateWorkspaceOptions {
  /** Wipe any existing `data/` + `artifacts/` first (stateless reproducibility). */
  reset?: boolean;
}

/**
 * Create (or reuse) an isolated workspace: a temp-rooted directory with `data/`
 * for resolved inputs and `artifacts/` as the sole permitted output location.
 * With `reset`, an existing workspace of the same id is wiped first so the run
 * is independent; without it, prior files persist (workspace_files sessions).
 */
export async function createWorkspace(
  workspaceId?: string,
  options?: CreateWorkspaceOptions,
): Promise<WorkspaceHandle> {
  if (workspaceId !== undefined && !/^[A-Za-z0-9_-]+$/.test(workspaceId)) {
    throw new Error(`${ERROR_MESSAGES.INVALID_WORKSPACE_ID}: ${workspaceId}`);
  }
  const id = workspaceId ?? randomId("ws_");
  const dir = workspaceDir(id);
  const artifactsDir = workspaceArtifactsDir(id);
  const dataDir = workspaceDataDir(id);
  if (options?.reset) {
    await rm(dir, { recursive: true, force: true });
  }
  await mkdir(artifactsDir, { recursive: true, mode: DIR_MODE });
  await mkdir(dataDir, { recursive: true, mode: DIR_MODE });
  return { workspaceId: id, dir, artifactsDir, dataDir };
}
