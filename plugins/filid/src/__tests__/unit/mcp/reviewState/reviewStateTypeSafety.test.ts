import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/** Review-state source root anchored to this test file instead of process cwd. */
const REVIEW_STATE_DIRECTORY = fileURLToPath(
  new URL('../../../../mcp/tools/reviewState/', import.meta.url),
);

/**
 * Collect every TypeScript source beneath a directory.
 * @param directory Absolute directory to walk recursively.
 * @returns Absolute paths for all descendant `.ts` files.
 */
function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(path);
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });
}

describe('review-state type safety', () => {
  it('contains no forbidden casts that suppress checker narrowing', () => {
    const forbiddenCasts = ['as unknown as', 'as any'];
    const violations = collectTypeScriptFiles(REVIEW_STATE_DIRECTORY).flatMap(
      (path) => {
        const source = readFileSync(path, 'utf8');
        return forbiddenCasts
          .filter((cast) => source.includes(cast))
          .map((cast) => `${path}: ${cast}`);
      },
    );

    expect(violations).toEqual([]);
  });
});
