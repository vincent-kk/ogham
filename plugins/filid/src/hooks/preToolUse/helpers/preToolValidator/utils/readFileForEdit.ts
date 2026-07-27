import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

export function readFileForEdit(
  filePath: string,
  safeCwd: string,
): string | undefined {
  const absolutePath = isAbsolute(filePath)
    ? filePath
    : resolve(safeCwd, filePath);
  try {
    return readFileSync(absolutePath, 'utf-8');
  } catch {
    return undefined;
  }
}
