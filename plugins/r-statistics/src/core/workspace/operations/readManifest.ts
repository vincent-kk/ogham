import { readFile } from "node:fs/promises";

import { workspaceManifestPath } from "../../../constants/paths.js";
import type { RArtifactManifest } from "../../../types/rExecution.js";
import { isFileNotFound } from "../../../utils/isFileNotFound.js";

/**
 * Parse ARTIFACTS_DIR/manifest.json (written by the R contract footer). Returns
 * undefined when the script produced no manifest.
 */
export async function readManifest(
  workspaceId: string,
): Promise<RArtifactManifest | undefined> {
  try {
    const raw = await readFile(workspaceManifestPath(workspaceId), "utf8");
    return JSON.parse(raw) as RArtifactManifest;
  } catch (error) {
    if (isFileNotFound(error)) return undefined;
    throw error;
  }
}
