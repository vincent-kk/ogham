import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ecmascriptStructureAdapter } from '../../../adapters/ecmascript/index.js';
import { extractFileFacts } from '../../../factsExtractor/index.js';

/** Temporary project each case extracts from. */
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-facts-source-text-'));
  writeFileSync(join(root, 'b.ts'), 'export const b = 1;\n');
  writeFileSync(join(root, 'c.ts'), 'export const c = 1;\n');
  writeFileSync(join(root, 'd.ts'), 'export const d = 1;\n');
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

/** Imports whose written specifier differs from its escape-reduced value, and one that does not. */
const CONSUMER = [
  "import { b } from './b\\.js';",
  "import { c } from './\\u0063.js';",
  "import { d } from './\\d.js';",
  "import { plain } from './b.js';",
  '',
].join('\n');

describe('a reference whose specifier the source spells with escapes carries its source text', () => {
  it('reports the written text on the adapter reference only when it differs from the specifier', async () => {
    writeFileSync(join(root, 'a.ts'), CONSUMER);
    expect(
      (
        await ecmascriptStructureAdapter.extractDependencies(join(root, 'a.ts'))
      ).map(({ sourceText }) => sourceText),
    ).toEqual(["'./b\\.js'", "'./\\u0063.js'", "'./\\d.js'", undefined]);
  });

  it('records text that exists in the file bytes for every reference', async () => {
    writeFileSync(join(root, 'a.ts'), CONSUMER);
    const bytes = readFileSync(join(root, 'a.ts'), 'utf8');
    const [record] = (await extractFileFacts(root, ['a.ts'], 'cmd')).records;
    expect(record.references).toHaveLength(4);
    for (const reference of record.references)
      expect(bytes).toContain(reference.sourceText ?? reference.specifier);
    expect(record.references.map(({ sourceText }) => sourceText)).toEqual([
      "'./b\\.js'",
      "'./\\u0063.js'",
      "'./\\d.js'",
      undefined,
    ]);
  });
});
