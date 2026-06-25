import { mkdir } from "node:fs/promises";

import { DIR_MODE } from "../../../constants/defaults.js";
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
  const id = workspaceId ?? randomId("ws_");
  const dir = workspaceDir(id);
  const artifactsDir = workspaceArtifactsDir(id);
  const dataDir = workspaceDataDir(id);
  await mkdir(artifactsDir, { recursive: true, mode: DIR_MODE });
  await mkdir(dataDir, { recursive: true, mode: DIR_MODE });
  return { workspaceId: id, dir, artifactsDir, dataDir };
}
