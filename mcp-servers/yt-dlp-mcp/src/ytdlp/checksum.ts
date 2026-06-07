import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

/** SHA-256 hex digest of a file. */
export async function sha256File(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

/** Extracts the expected hash for `assetName` from a SHA2-256SUMS manifest. */
export function parseSums(text: string, assetName: string): string | null {
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([0-9a-fA-F]{64})\s+\*?(.+)$/);
    if (match && match[2].trim() === assetName) return match[1];
  }
  return null;
}
