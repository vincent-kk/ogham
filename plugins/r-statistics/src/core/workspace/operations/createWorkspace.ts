import { mkdir } from "node:fs/promises";

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

/**
 * Create (or reuse) an isolated workspace: a temp-rooted directory with `data/`
 * for resolved inputs and `artifacts/` as the sole permitted output location.
 */
export async function createWorkspace(
  workspaceId?: string,
): Promise<WorkspaceHandle> {
  if (workspaceId !== undefined && !/^[A-Za-z0-9_-]+$/.test(workspaceId)) {
    throw new Error(`${ERROR_MESSAGES.INVALID_WORKSPACE_ID}: ${workspaceId}`);
  }
  const id = workspaceId ?? randomId("ws_");
  const dir = workspaceDir(id);
  const artifactsDir = workspaceArtifactsDir(id);
  const dataDir = workspaceDataDir(id);
  await mkdir(artifactsDir, { recursive: true, mode: DIR_MODE });
  await mkdir(dataDir, { recursive: true, mode: DIR_MODE });
  return { workspaceId: id, dir, artifactsDir, dataDir };
}
