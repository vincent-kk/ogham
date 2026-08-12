import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Guard on the bundled scaffold-pr script copy. The canonical file lives in
 * the seiri plugin and is functionally tested there; this copy must stay
 * byte-identical to it ("Shared byte-identical across ogham plugins —
 * change every copy together"), so behavior verified against the canonical
 * copy holds for this one.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const COPY_PATH = join(
  __dirname,
  '..',
  '..',
  'skills',
  'scaffold-pr',
  'scripts',
  'scaffold-pr.mjs',
);
const CANONICAL_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  'seiri',
  'skills',
  'scaffold-pr',
  'scripts',
  'scaffold-pr.mjs',
);

describe('scaffold-pr script copy', () => {
  it('ships byte-identical to the seiri canonical copy', () => {
    const copy = readFileSync(COPY_PATH, 'utf8');
    const canonical = readFileSync(CANONICAL_PATH, 'utf8');
    expect(copy).toBe(canonical);
  });
});
