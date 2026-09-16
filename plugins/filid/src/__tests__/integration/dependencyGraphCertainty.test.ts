import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAdapterRegistry } from '../../adapters/index.js';
import { createDefaultConfig } from '../../core/infra/configLoader/index.js';
import { createProjectSnapshot } from '../../core/projectSnapshot/index.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-dag-certainty-'));
  writeFileSync(join(root, 'index.ts'), 'export {};');
  mkdirSync(join(root, '__tests__'));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('snapshot DAG certainty and dependency diagnostics', () => {
  it('retains unresolved verification diagnostics without lowering DAG certainty', async () => {
    const sourceFile = join(root, '__tests__', 'feature.test.ts');
    writeFileSync(
      sourceFile,
      "import './missing.helpers'; it('checks feature', () => {});",
    );

    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      createDefaultConfig(),
    );

    expect(snapshot.verification.files.map((file) => file.path)).toContain(
      sourceFile,
    );
    expect(snapshot.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'unresolved-local-dependency',
        path: sourceFile,
        specifier: './missing.helpers',
      }),
    );
    expect(snapshot.dependencyGraph.certainty).toBe('exact');
    expect(snapshot.dependencyGraph.cycles).toEqual([]);
  });

  it('keeps unclassified test-looking production imports indeterminate', async () => {
    const sourceFile = join(root, '__tests__', 'feature.test.ts');
    writeFileSync(
      sourceFile,
      "import './missing.helpers'; export const value = true;",
    );

    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      createDefaultConfig(),
    );

    expect(snapshot.verification.files).toEqual([]);
    expect(snapshot.dependencyGraph.certainty).toBe('indeterminate');
    expect(snapshot.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'unresolved-local-dependency',
        path: sourceFile,
      }),
    );
  });
});
