import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import {
  portableDirname as dirname,
  portableJoin as join,
} from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { createAdapterRegistry } from '../../../adapters/index.js';
import { seedFacts } from '../../../__tests__/integration/helpers/seedFacts.js';
import { createDefaultConfig } from '../../infra/configLoader/index.js';
import { createProjectSnapshot } from '../index.js';

const roots: string[] = [];

function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'filid-dependency-axis-'));
  roots.push(root);
  return root;
}

function write(root: string, relativePath: string, content: string): string {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  return path;
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('dependency-axis diagnostics name what the graph could not use', () => {
  it('reports unowned-local-dependency for a root import when no fractal owns the root', async () => {
    const root = project();
    write(root, 'package.json', '{"name":"no-root-fractal"}');
    write(root, 'vite.config.ts', "import { helper } from './lib/helper.js';");
    write(root, 'lib/INTENT.md', '# lib');
    write(root, 'lib/DETAIL.md', '# lib contract');
    write(root, 'lib/index.ts', "export { helper } from './helper.js';");
    write(root, 'lib/helper.ts', 'export const helper = 1;');
    await seedFacts(root);

    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      createDefaultConfig(),
    );

    const dependencyDiagnostics = snapshot.diagnostics.filter((diagnostic) =>
      diagnostic.affects?.includes('dependencies'),
    );
    expect(dependencyDiagnostics).toContainEqual(
      expect.objectContaining({ code: 'unowned-local-dependency' }),
    );
    // The reference has no node to hang on, so it is a finding and not a gap:
    // making a boundary is the user's call and cannot stop the analysis.
    expect(snapshot.dependencyGraph.unknownFiles).toEqual([]);
    expect(snapshot.dependencyGraph.certainty).toBe('exact');
  });

  it('keeps analysing a repository that has adopted no fractal at all', async () => {
    const root = project();
    write(root, 'package.json', '{"name":"no-fractal"}');
    write(root, 'src/index.ts', "export { helper } from './helper.js';");
    write(root, 'src/helper.ts', 'export const helper = 1;');
    await seedFacts(root);

    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      createDefaultConfig(),
    );

    expect(
      snapshot.diagnostics.filter((diagnostic) =>
        diagnostic.affects?.includes('dependencies'),
      ),
    ).toEqual([]);
    expect(snapshot.dependencyGraph.unknownFiles).toEqual([]);
    expect(snapshot.dependencyGraph.certainty).toBe('exact');
    expect(snapshot.dependencyGraph.cycles).toEqual([]);
    expect(snapshot.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'intent-document-contract' }),
    );
  });

  it('attributes every file to itself when no structure adapter is active', async () => {
    const root = project();
    write(root, 'INTENT.md', '# root');
    write(root, 'DETAIL.md', '# root contract');
    write(root, 'index.ts', 'export const value = 1;');

    const config = createDefaultConfig();
    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      { ...config, adapters: { mode: 'explicit', enabled: [] } },
    );

    expect(snapshot.dependencyGraph.certainty).not.toBe('exact');
    expect(snapshot.dependencyGraph.unknownFiles).toEqual([
      { path: 'index.ts', causes: ['facts-missing'] },
    ]);
    expect(
      snapshot.diagnostics.filter((diagnostic) =>
        diagnostic.affects?.includes('dependencies'),
      ),
    ).toEqual([]);
  });
});
