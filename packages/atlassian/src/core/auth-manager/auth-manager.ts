import type { Credentials } from '../../types/index.js';
import { CREDENTIALS_PATH } from '../../constants/index.js';
import { readJson, writeJson } from '../../lib/file-io.js';
import { buildAuthHeader } from '../../utils/index.js';

type ServiceName = 'jira' | 'confluence';

/** Load all credentials from JSON storage */
export async function loadCredentials(
  path: string = CREDENTIALS_PATH,
): Promise<Credentials> {
  return readJson<Credentials>(path, undefined, {});
}

/** Save credentials to JSON storage */
export async function saveCredentials(
  credentials: Credentials,
  path: string = CREDENTIALS_PATH,
): Promise<void> {
  await writeJson(path, credentials);
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
