import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

/** Read credentials from plain JSON file */
export async function readCredentials<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/** Write credentials to plain JSON file */
export async function writeCredentials(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const json = JSON.stringify(data, null, 2);
  await writeFile(path, json, 'utf-8');
}
