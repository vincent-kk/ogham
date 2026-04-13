import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { encrypt, decrypt, getEncryptionKey } from '../../utils/index.js';

export { encrypt, decrypt, getEncryptionKey };

/** Read and decrypt credentials from file */
export async function readCredentials<T>(path: string, key: Buffer): Promise<T | null> {
  try {
    const raw = await readFile(path);
    const json = decrypt(raw, key);
    return JSON.parse(json) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/** Encrypt and write credentials to file */
export async function writeCredentials(path: string, data: unknown, key: Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const json = JSON.stringify(data, null, 2);
  const encrypted = encrypt(json, key);
  await writeFile(path, encrypted);
}
