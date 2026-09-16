import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ecmascriptStructureAdapter } from '../../../adapters/ecmascript/index.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-dependency-resolution-'));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('local dependency filename resolution regressions', () => {
  it.each([
    ['./SchemaNodePropsFlow.helpers', 'SchemaNodePropsFlow.helpers.tsx'],
    [
      './BranchStrategy.composition.fixtures',
      'BranchStrategy.composition.fixtures.ts',
    ],
    ['./feature.js', 'feature.ts'],
    ['./feature.mjs', 'feature.mts'],
    ['./feature.cjs', 'feature.cts'],
    ['./feature.helpers.js', 'feature.helpers.ts'],
    ['./feature', 'feature/index.ts'],
    ['./feature.helpers', 'feature.helpers/index.tsx'],
  ])('resolves %s to %s', async (specifier, target) => {
    const source = join(root, 'consumer.ts');
    const resolvedPath = join(root, target);
    mkdirSync(dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, 'export {};');
    writeFileSync(source, `import '${specifier}';`);

    expect(
      await ecmascriptStructureAdapter.extractDependencies(source),
    ).toEqual([
      {
        sourceFile: source,
        rawSpecifier: specifier,
        resolvedPath,
        kind: 'static',
      },
    ]);
  });

  it('preserves a dotted basename when a shorter sibling also exists', async () => {
    const source = join(root, 'consumer.ts');
    writeFileSync(source, "import './feature.helpers';");
    writeFileSync(join(root, 'feature.ts'), 'export {};');
    writeFileSync(join(root, 'feature.helpers.ts'), 'export {};');

    expect(
      await ecmascriptStructureAdapter.extractDependencies(source),
    ).toMatchObject([{ resolvedPath: join(root, 'feature.helpers.ts') }]);
  });

  it('does not resolve a missing dotted basename to a shorter sibling', async () => {
    const source = join(root, 'consumer.ts');
    writeFileSync(source, "export * from './feature.helpers';");
    writeFileSync(join(root, 'feature.ts'), 'export {};');

    expect(
      await ecmascriptStructureAdapter.extractDependencies(source),
    ).toMatchObject([
      {
        rawSpecifier: './feature.helpers',
        resolvedPath: null,
        kind: 're-export',
      },
    ]);
  });

  it('prefers an existing exact path over source extension substitution', async () => {
    const source = join(root, 'consumer.ts');
    writeFileSync(source, "import './feature.js';");
    writeFileSync(join(root, 'feature.js'), 'export {};');
    writeFileSync(join(root, 'feature.ts'), 'export {};');

    expect(
      await ecmascriptStructureAdapter.extractDependencies(source),
    ).toMatchObject([{ resolvedPath: join(root, 'feature.js') }]);
  });
});
