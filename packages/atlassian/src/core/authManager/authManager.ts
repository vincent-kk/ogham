import { stat, chmod } from "node:fs/promises";

import type { Credentials } from "../../types/index.js";
import { CREDENTIALS_PATH } from "../../constants/index.js";
import { readJson, writeJson } from "../../lib/fileIo.js";
import { buildAuthHeader } from "../../utils/index.js";

type ServiceName = "jira" | "confluence";

/** Load all credentials from JSON storage. Defense-in-depth: tighten file
 *  permissions to 0o600 if a pre-existing file was created under a permissive
 *  umask before saveCredentials was hardened. */
export async function loadCredentials(
  path: string = CREDENTIALS_PATH,
): Promise<Credentials> {
  try {
    const s = await stat(path);
    if ((s.mode & 0o077) !== 0) await chmod(path, 0o600);
  } catch {
    // ENOENT is expected on first run; readJson handles it via the fallback
  }
  return readJson<Credentials>(path, undefined, {});
}

/** Save credentials to JSON storage with owner-only permissions (0o600) */
export async function saveCredentials(
  credentials: Credentials,
  path: string = CREDENTIALS_PATH,
): Promise<void> {
  await writeJson(path, credentials, { mode: 0o600 });
}

/** Get the Basic auth header for a specific service */
export async function getAuthHeader(
  service: ServiceName,
  username?: string,
  credentialsPath?: string,
): Promise<string | null> {
  const credentials = await loadCredentials(credentialsPath);
  const serviceCredentials = credentials[service];
  if (!serviceCredentials) return null;

  const payload = buildAuthHeader(serviceCredentials, username);
  return payload?.value ?? null;
}
