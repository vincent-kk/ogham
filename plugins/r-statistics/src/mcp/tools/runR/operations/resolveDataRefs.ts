import { copyFile, realpath, writeFile } from "node:fs/promises";
import { extname, isAbsolute, join, sep } from "node:path";

import { FILE_MODE } from "../../../../constants/defaults.js";
import { ERROR_MESSAGES } from "../../../../constants/messages.js";
import { inputDataRoot } from "../../../../constants/paths.js";
import type { RDataRef } from "../../../../types/rExecution.js";

interface DataRefManifestEntry {
  file: string;
  format: string;
  encoding?: string;
}

/**
 * Realpath-resolve the allow-root every input path must sit under. A symlinked
 * root is resolved so it compares against realpath-resolved refs. A missing or
 * unresolvable root (misconfigured R_STATISTICS_DATA_ROOT) → DATA_ROOT_INVALID.
 */
async function resolveAllowedRoot(): Promise<string> {
  try {
    return await realpath(inputDataRoot());
  } catch {
    throw new Error(ERROR_MESSAGES.DATA_ROOT_INVALID);
  }
}

/**
 * Copy each declared input dataset into the workspace `data/` dir and write a
 * `refs.json` map (id → file/format/encoding). The contract's `.rstat_init`
 * loads this into a `data_refs` named list so user code never builds paths.
 *
 * The MCP — not the gated R code — performs this copy, so an unrestricted
 * source path is an exfiltration channel that bypasses the R command gate
 * (e.g. pulling ~/.ssh/id_rsa into data/ for a benign read). Every source path
 * must therefore be absolute and realpath-resolve under the allow-root.
 */
export async function resolveDataRefs(
  dataDir: string,
  refs: RDataRef[] = [],
): Promise<void> {
  // No inputs → no refs.json, so the contract's init never needs a JSON parser.
  if (refs.length === 0) return;

  const root = await resolveAllowedRoot();
  const manifest: Record<string, DataRefManifestEntry> = {};
  for (const ref of refs) {
    // Reject ids with path separators — they become the copied file name and a
    // `../` would escape the workspace data dir (isolation breach).
    if (!/^[A-Za-z0-9_-]+$/.test(ref.id))
      throw new Error(`${ERROR_MESSAGES.INVALID_DATA_REF_ID}: ${ref.id}`);

    // Absolute path required; realpath defeats symlink escapes before the
    // containment check below.
    if (!isAbsolute(ref.path))
      throw new Error(`${ERROR_MESSAGES.DATA_REF_OUTSIDE_ROOT}: ${ref.id}`);

    let real: string;
    try {
      real = await realpath(ref.path);
    } catch {
      throw new Error(`${ERROR_MESSAGES.DATA_REF_NOT_FOUND}: ${ref.id}`);
    }
    if (real !== root && !real.startsWith(root + sep))
      throw new Error(`${ERROR_MESSAGES.DATA_REF_OUTSIDE_ROOT}: ${ref.id}`);

    const fileName = `${ref.id}${extname(ref.path) || `.${ref.format}`}`;
    await copyFile(real, join(dataDir, fileName));
    manifest[ref.id] = {
      file: fileName,
      format: ref.format,
      encoding: ref.encoding,
    };
  }
  await writeFile(
    join(dataDir, "refs.json"),
    JSON.stringify(manifest, null, 2),
    { mode: FILE_MODE },
  );
}
