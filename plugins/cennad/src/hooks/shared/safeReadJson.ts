import { readFileSync } from 'node:fs';

export function safeReadJson<T = unknown>(path: string): T | null {
  try {
    const raw = readFileSync(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
