import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { tmp } from '@ogham/cross-platform';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { classifyRelevanceTarget } from '../../../core/analysis/dependencyGraph/index.js';
import { createToolSnapshot } from '../../../mcp/tools/utils/createToolSnapshot.js';
import type { FractalTree } from '../../../types/fractal.js';
import { FIXTURE_INTENT } from '../../integration/reviewFlow/helpers/reviewFlowRepositoryFiles.js';
import { seedFacts } from '../../integration/helpers/seedFacts.js';

/** Project with a manifest-only root, a fractal `domain` and its organ `domain/utils`, each with a module index. */
const FILES: Readonly<Record<string, string>> = {
  'package.json': '{"name":"fixture","type":"module"}\n',
  'INTENT.md': FIXTURE_INTENT,
  'domain/INTENT.md': FIXTURE_INTENT,
  'domain/index.ts': "export { helper } from './utils/index.js';\n",
  'domain/value.ts': 'export const value = 1;\n',
  'domain/utils/index.ts': "export { helper } from './helper.js';\n",
  'domain/utils/helper.ts': 'export const helper = 2;\n',
};

/** Temporary project root. */
let projectRoot: string;
/** Tree of the project's snapshot, carrying the adapter's entry points. */
let tree: FractalTree;

beforeAll(async () => {
  projectRoot = mkdtempSync(join(tmp(), 'filid-relevance-kind-'));
  for (const [path, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(projectRoot, path)), { recursive: true });
    writeFileSync(join(projectRoot, path), text);
  }
  await seedFacts(projectRoot);
  tree = (await createToolSnapshot(projectRoot)).snapshot.tree;
});
afterAll(() => rmSync(projectRoot, { recursive: true, force: true }));

describe('a relevance target is a module index exactly when the adapter reported it as its directory module entry', () => {
  it.each([
    ['a fractal module index', 'domain/index.ts', false, 'module-index'],
    ['an organ module index', 'domain/utils/index.ts', false, 'module-index'],
    ['a plain fractal file', 'domain/value.ts', false, 'file'],
    ['a plain organ file', 'domain/utils/helper.ts', false, 'file'],
    ['a manifest entry, which is not a module', 'package.json', false, 'file'],
    ['a directory', 'domain/utils', true, 'directory'],
  ] as const)('%s → %s', (_label, path, isDirectory, kind) => {
    expect(
      classifyRelevanceTarget(tree, join(projectRoot, path), isDirectory),
    ).toBe(kind);
  });
});
