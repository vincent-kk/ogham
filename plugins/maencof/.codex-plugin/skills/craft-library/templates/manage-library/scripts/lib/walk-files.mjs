import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Enumerate regular files beneath a directory in deterministic path order.
 * @param {string} root absolute directory to scan
 * @returns {string[]} slash-separated relative file paths
 */
export function walkFiles(root) {
  const files = [];
  const visit = (directory, prefix) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(join(directory, entry.name), relative);
      else if (entry.isFile()) files.push(relative);
    }
  };
  visit(root, '');
  return files.sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}
