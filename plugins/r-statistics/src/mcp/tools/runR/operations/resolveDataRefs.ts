import { access, copyFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { FILE_MODE } from "../../../../constants/defaults.js";
import { ERROR_MESSAGES } from "../../../../constants/messages.js";
import type { RDataRef } from "../../../../types/rExecution.js";

interface DataRefManifestEntry {
  file: string;
  format: string;
  encoding?: string;
}

/**
 * Copy each declared input dataset into the workspace `data/` dir and write a
 * `refs.json` map (id → file/format/encoding). The contract's `.rstat_init`
 * loads this into a `data_refs` named list so user code never builds paths.
 */
export async function resolveDataRefs(
  dataDir: string,
  refs: RDataRef[] = [],
): Promise<void> {
  // No inputs → no refs.json, so the contract's init never needs a JSON parser.
  if (refs.length === 0) return;

  const manifest: Record<string, DataRefManifestEntry> = {};
  for (const ref of refs) {
    try {
      await access(ref.path);
    } catch {
      throw new Error(`${ERROR_MESSAGES.DATA_REF_NOT_FOUND}: ${ref.id}`);
    }
    const fileName = `${ref.id}${extname(ref.path) || `.${ref.format}`}`;
    await copyFile(ref.path, join(dataDir, fileName));
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
