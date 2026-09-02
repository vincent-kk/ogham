import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Recursively copy a template while preserving every existing destination file.
 * @param {string} source absolute template directory
 * @param {string} target absolute destination directory
 * @returns {void}
 */
export function copyMissingFiles(source, target) {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const sourcePath = join(source, entry.name);
    const targetPath = join(target, entry.name);
    if (entry.isDirectory()) copyMissingFiles(sourcePath, targetPath);
    else if (!existsSync(targetPath)) copyFileSync(sourcePath, targetPath);
  }
}
