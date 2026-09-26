import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, it } from 'vitest';

import { handleMaencofCreate } from '../index.js';

it('reports final document size without rejecting or truncating it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'budget-create-'));
  try {
    await mkdir(join(root, '02_Derived'));
    await writeFile(
      join(root, '02_Derived/large.md'),
      '---\nlayer: 2\ntags: [test]\ncreated: 2026-09-26\nupdated: 2026-09-26\n---\n' +
        'x'.repeat(6001),
    );
    const result = await handleMaencofCreate(root, {
      layer: 2,
      tags: ['test'],
      content: 'x'.repeat(6001),
      title: 'Budget',
    });
    expect(result.success).toBe(true);
    expect(
      result.warnings?.some(
        (warning) =>
          warning.includes('document_size_exceeded') &&
          warning.includes('body_chars=6011'),
      ),
    ).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
