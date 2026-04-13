import type { AuthType, Credentials, ServiceCredentials, TokenPayload } from '../../types/index.js';
import { CREDENTIALS_PATH } from '../../constants/index.js';
import { getEncryptionKey, readCredentials, writeCredentials } from './credential-store.js';

type ServiceName = 'jira' | 'confluence';

/** Load all credentials from encrypted storage */
export async function loadCredentials(path: string = CREDENTIALS_PATH): Promise<Credentials> {
  const key = getEncryptionKey();
  const creds = await readCredentials<Credentials>(path, key);
  return creds ?? {};
}

/** Save credentials to encrypted storage */
export async function saveCredentials(
  credentials: Credentials,
  path: string = CREDENTIALS_PATH,
): Promise<void> {
  const key = getEncryptionKey();
  await writeCredentials(path, credentials, key);
}

/** Build an Authorization header value for the given service and auth type */
export function buildAuthHeader(
  authType: AuthType,
  serviceCreds: ServiceCredentials,
  username?: string,
): TokenPayload | null {
  switch (authType) {
    case 'basic': {
      const basic = serviceCreds.basic;
      if (!basic || !username) return null;
      const token = basic.api_token ?? basic.password;
      if (!token) return null;
      const encoded = Buffer.from(`${username}:${token}`).toString('base64');
      return { type: 'basic', value: `Basic ${encoded}` };
    }
    case 'pat': {
      const pat = serviceCreds.pat;
      if (!pat) return null;
      return { type: 'bearer', value: `Bearer ${pat.personal_token}` };
    }
    case 'oauth': {
      const oauth = serviceCreds.oauth;
      if (!oauth) return null;
      return { type: 'bearer', value: `Bearer ${oauth.access_token}` };
    }
  }
}

/** Get the auth header for a specific service */
export async function getAuthHeader(
  service: ServiceName,
  authType: AuthType,
  username?: string,
  credentialsPath?: string,
): Promise<string | null> {
  const credentials = await loadCredentials(credentialsPath);
  const serviceCreds = credentials[service];
  if (!serviceCreds) return null;

  const payload = buildAuthHeader(authType, serviceCreds, username);
  return payload?.value ?? null;
}
