import { stat, chmod } from "node:fs/promises";

import type { EntrezConfig } from "../../../types/config.js";
import { EntrezConfigSchema } from "../../../types/config.js";
import { CONFIG_PATH } from "../../../constants/paths.js";
import { readJson } from "../../../lib/fileIo.js";

/**
 * Load config.json. Returns null when not configured (tool/email are required,
 * so an absent file is not a valid empty config). Defense-in-depth: tightens
 * permissions to 0o600 if a pre-existing file drifted.
 */
export async function loadConfig(
  path: string = CONFIG_PATH,
): Promise<EntrezConfig | null> {
  try {
    const s = await stat(path);
    if ((s.mode & 0o077) !== 0) await chmod(path, 0o600);
  } catch {
    // ENOENT expected on first run.
  }
  try {
    const raw = await readJson<unknown>(path);
    return EntrezConfigSchema.parse(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
