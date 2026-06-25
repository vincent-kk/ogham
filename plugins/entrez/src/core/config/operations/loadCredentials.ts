import { stat, chmod } from "node:fs/promises";

import type { EntrezCredentials } from "../../../types/config.js";
import { EntrezCredentialsSchema } from "../../../types/config.js";
import { CREDENTIALS_PATH } from "../../../constants/paths.js";
import { readJson } from "../../../lib/fileIo.js";

/**
 * Load credentials.json (api_key). Returns {} when absent. Defense-in-depth:
 * tightens permissions to 0o600 if a pre-existing file drifted. The LLM never
 * reads this — only the HTTP client, via dependency injection.
 */
export async function loadCredentials(
  path: string = CREDENTIALS_PATH,
): Promise<EntrezCredentials> {
  try {
    const s = await stat(path);
    if ((s.mode & 0o077) !== 0) await chmod(path, 0o600);
  } catch {
    // ENOENT expected on first run.
  }
  return readJson<EntrezCredentials>(path, EntrezCredentialsSchema, {});
}
