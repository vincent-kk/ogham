import { readdir, realpath, stat } from "node:fs/promises";
import { extname, join, sep } from "node:path";

import { ALLOWED_ARTIFACT_EXTENSIONS } from "../../../constants/defaults.js";
import { ERROR_MESSAGES } from "../../../constants/messages.js";
import { workspaceArtifactsDir } from "../../../constants/paths.js";
import { ArtifactKind } from "../../../types/enums.js";
import type {
  RArtifact,
  RArtifactManifest,
} from "../../../types/rExecution.js";
import { mimeForExtension } from "../../../utils/mimeForExtension.js";
import { randomId } from "../../../utils/randomId.js";
import { sha256File } from "../../../utils/sha256File.js";

const MANIFEST_FILE = "manifest.json";
const ALLOWED_EXTENSIONS: readonly string[] = ALLOWED_ARTIFACT_EXTENSIONS;

function kindFromExtension(extension: string): ArtifactKind {
  switch (extension) {
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".svg":
    case ".pdf":
      return ArtifactKind.Plot;
    case ".csv":
    case ".tsv":
    case ".rds":
      return ArtifactKind.Data;
    case ".html":
    case ".docx":
      return ArtifactKind.Report;
    case ".json":
      return ArtifactKind.Table;
    default:
      return ArtifactKind.Log;
  }
}

/**
 * Collect output files from ARTIFACTS_DIR only: extension whitelist + sha256 +
 * symlink-escape rejection (a link resolving outside the real artifacts root is
 * a policy failure). Artifact kind is taken from the manifest when declared,
 * else inferred from the extension.
 */
export async function collectArtifacts(
  workspaceId: string,
  manifest?: RArtifactManifest,
): Promise<RArtifact[]> {
  const artifactsDir = workspaceArtifactsDir(workspaceId);
  let realRoot: string;
  let entries: string[];
  try {
    realRoot = await realpath(artifactsDir);
    entries = await readdir(artifactsDir);
  } catch {
    return [];
  }

  const kindByFile = new Map<string, ArtifactKind>();
  for (const entry of manifest?.artifacts ?? []) {
    kindByFile.set(entry.file, entry.kind);
  }

  const collected: RArtifact[] = [];
  for (const name of entries) {
    if (name === MANIFEST_FILE) continue;
    const extension = extname(name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) continue;

    const fullPath = join(artifactsDir, name);
    let real: string;
    try {
      real = await realpath(fullPath);
    } catch {
      continue;
    }
    if (real !== join(realRoot, name) && !real.startsWith(realRoot + sep)) {
      throw new Error(ERROR_MESSAGES.ARTIFACT_OUTSIDE_DIR);
    }
    if (!(await stat(real)).isFile()) continue;

    collected.push({
      id: randomId("art_"),
      kind: kindByFile.get(name) ?? kindFromExtension(extension),
      path: real,
      mimeType: mimeForExtension(extension),
      sha256: await sha256File(real),
    });
  }
  return collected;
}
