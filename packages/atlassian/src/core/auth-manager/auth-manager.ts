import type { AuthType, Credentials } from '../../types/index.js';
import { CREDENTIALS_PATH } from '../../constants/index.js';
import { readCredentials, writeCredentials } from './credential-store.js';
import { buildAuthHeader } from '../../utils/index.js';

type ServiceName = 'jira' | 'confluence';

/** Load all credentials from JSON storage */
export async function loadCredentials(
  path: string = CREDENTIALS_PATH,
): Promise<Credentials> {
  const credentials = await readCredentials<Credentials>(path);
  return credentials ?? {};
}

/** Save credentials to JSON storage */
export async function saveCredentials(
  credentials: Credentials,
  path: string = CREDENTIALS_PATH,
): Promise<void> {
  await writeCredentials(path, credentials);
}

/** Get the auth header for a specific service */
export async function getAuthHeader(
  service: ServiceName,
  authType: AuthType,
  username?: string,
  credentialsPath?: string,
): Promise<string | null> {
  const credentials = await loadCredentials(credentialsPath);
  const serviceCredentials = credentials[service];
  if (!serviceCredentials) return null;

  const payload = buildAuthHeader(authType, serviceCredentials, username);
  return payload?.value ?? null;
}
