import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { hostname, userInfo } from 'node:os';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/** Derive a stable encryption key from a seed */
export function deriveKey(seed: string): Buffer {
  return createHash('sha256').update(seed).digest();
}

/** Encrypt data with AES-256-GCM */
export function encrypt(data: string, key: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

/** Decrypt data with AES-256-GCM */
export function decrypt(data: Buffer, key: Buffer): string {
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf-8');
}

/** Get or generate the encryption key for this machine */
export function getEncryptionKey(): Buffer {
  const seed = `atlassian-mcp-${hostname()}-${userInfo().username}`;
  return deriveKey(seed);
}
