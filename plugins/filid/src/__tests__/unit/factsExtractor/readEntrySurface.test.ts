import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { inspectEntrySurface } from '../../../factsExtractor/analysis/entrySurface/readEntrySurface.js';

/** Temporary project each case writes its entry point into. */
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-entry-surface-'));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

/**
 * Write a file under the case's project root.
 * @param relativePath Path relative to the root.
 * @param content File body.
 * @returns The absolute path written.
 */
function writeIn(relativePath: string, content = ''): string {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  return path;
}

describe('the surface an entry point declares in its own text', () => {
  it('reports an entry surface whose export hides behind an apostrophe as indeterminate', async () => {
    const entry = writeIn(
      'src/index.tsx',
      "export const Note = () => <p>Don't</p>; export { hidden } from './hidden.js';\n",
    );

    const inspection = await inspectEntrySurface(entry);

    expect(inspection.certainty).toBe('indeterminate');
  });

  it('reports an entry surface whose export hides behind a quote mispaired after a URL as indeterminate', async () => {
    const entry = writeIn(
      'src/index.tsx',
      "export const Note = () => <a href=\"https://x.dev\">Don't</a>; export { hidden } from './hidden.js';\n",
    );

    const inspection = await inspectEntrySurface(entry);

    expect(inspection.certainty).toBe('indeterminate');
  });

  it('distrusts an export the scan read as code inside a mispaired string', async () => {
    const entry = writeIn(
      'src/index.tsx',
      "render(<p>I'm \"quoted\"</p>); f('x; export const zz = 1');\n",
    );

    const inspection = await inspectEntrySurface(entry);

    expect(inspection.certainty).toBe('indeterminate');
  });

  it('enumerates named exports and detects direct declarations', async () => {
    const entry = writeIn(
      'src/index.ts',
      [
        "export { value } from './value.js';",
        'export const direct = 1;',
        'export type PublicShape = { value: number };',
      ].join('\n'),
    );

    const inspection = await inspectEntrySurface(entry);

    expect(inspection.exportedNames).toEqual(
      expect.arrayContaining(['value', 'direct', 'PublicShape']),
    );
    expect(inspection.hasDirectDeclarations).toBe(true);
    expect(inspection.certainty).toBe('exact');
  });
});
