import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import {
  portableDirname as dirname,
  portableJoin as join,
} from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createAdapterRegistry,
  ecmascriptStructureAdapter,
} from '../../adapters/index.js';
import { createDefaultConfig } from '../../core/infra/configLoader/index.js';
import { createProjectSnapshot } from '../../core/projectSnapshot/index.js';
import type { StructureAdapter } from '../../types/adapters.js';

import { seedFacts } from './helpers/seedFacts.js';
import { FIXTURE_INTENT } from './reviewFlow/helpers/reviewFlowRepositoryFiles.js';

/** Temporary roots removed after each case. */
const roots: string[] = [];

/** One fractal that re-exports a child fractal's entry point. */
const PROJECT: Readonly<Record<string, string>> = {
  'package.json': '{"name":"divergence","type":"module"}\n',
  'INTENT.md': FIXTURE_INTENT,
  'index.ts': "export { helper } from './lib/index.js';\n",
  'lib/INTENT.md': FIXTURE_INTENT,
  'lib/index.ts': "export { helper } from './helper.js';\n",
  'lib/helper.ts': 'export const helper = 1;\n',
};

/** Files the counting adapter was asked to read. */
let parsed: string[] = [];

/**
 * The ecmascript adapter, counting reads and hiding one file's references.
 * @param silentPath Project-relative path the adapter reports nothing for.
 * @returns An adapter with the same id, so ownership is unchanged.
 */
function countingAdapter(silentPath?: string): StructureAdapter {
  return {
    ...ecmascriptStructureAdapter,
    async extractDependencies(filePath) {
      parsed.push(filePath);
      const found = await ecmascriptStructureAdapter.extractDependencies(
        filePath,
      );
      return silentPath !== undefined && filePath.endsWith(silentPath)
        ? []
        : found;
    },
  };
}

/**
 * Write the fixture project under a fresh temporary root.
 * @returns The absolute root.
 */
function writeProject(): string {
  const root = mkdtempSync(join(tmpdir(), 'filid-divergence-'));
  roots.push(root);
  for (const [path, content] of Object.entries(PROJECT)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content, 'utf8');
  }
  return root;
}

afterEach(() => {
  parsed = [];
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('the adapter is measured against the store, never consulted by it', () => {
  it('asks no adapter to read a file on the default path', async () => {
    const root = writeProject();
    await seedFacts(root);

    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry({ structure: [countingAdapter()] }),
      createDefaultConfig(),
    );

    expect(parsed).toEqual([]);
    expect(snapshot.dependencyGraph.edges.length).toBeGreaterThan(0);
  });

  it('reports a file the two sources describe differently, without blocking', async () => {
    const root = writeProject();
    await seedFacts(root);

    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry({ structure: [countingAdapter('lib/index.ts')] }),
      createDefaultConfig(),
      { compareAdapterEvidence: true },
    );

    expect(parsed.length).toBeGreaterThan(0);
    expect(snapshot.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'facts-adapter-divergence',
        path: join(root, 'lib', 'index.ts'),
        affects: [],
      }),
    );
    expect(snapshot.dependencyGraph.certainty).toBe('exact');
    expect(
      snapshot.dependencyGraph.edges.map(
        ({ fromFractalPath, toFractalPath }) =>
          `${fromFractalPath} -> ${toFractalPath}`,
      ),
    ).toContain(`${root} -> ${join(root, 'lib')}`);
  });

  it('reports nothing when both sources agree about every exact file', async () => {
    const root = writeProject();
    await seedFacts(root);

    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry({ structure: [countingAdapter()] }),
      createDefaultConfig(),
      { compareAdapterEvidence: true },
    );

    expect(parsed.length).toBeGreaterThan(0);
    expect(snapshot.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: 'facts-adapter-divergence' }),
    );
  });
});
