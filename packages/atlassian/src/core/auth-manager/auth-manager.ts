import type { AuthType, Credentials } from '../../types/index.js';
import { CREDENTIALS_PATH } from '../../constants/index.js';
import { getEncryptionKey, readCredentials, writeCredentials } from './credential-store.js';
import { buildAuthHeader } from '../../utils/index.js';

type ServiceName = 'jira' | 'confluence';

/** Load all credentials from encrypted storage */
export async function loadCredentials(
  path: string = CREDENTIALS_PATH,
): Promise<Credentials> {
  const key = getEncryptionKey();
  const credentials = await readCredentials<Credentials>(path, key);
  return credentials ?? {};
}

/** Save credentials to encrypted storage */
export async function saveCredentials(
  credentials: Credentials,
  path: string = CREDENTIALS_PATH,
): Promise<void> {
  const key = getEncryptionKey();
  await writeCredentials(path, credentials, key);
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
