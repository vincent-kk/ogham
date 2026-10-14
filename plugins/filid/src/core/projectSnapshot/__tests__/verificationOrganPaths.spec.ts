// filid:contract AC-snapshot-verification-organs
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createAdapterRegistry } from '../../../adapters/index.js';
import { seedFacts } from '../../../__tests__/integration/helpers/seedFacts.js';
import { createDefaultConfig } from '../../infra/configLoader/index.js';
import { checkExternalImportBoundary } from '../../rules/ruleEngine/utils/checkExternalImportBoundary.js';
import { createProjectSnapshot } from '../index.js';

const roots: string[] = [];

/**
 * Write one fixture file, creating its parent directories.
 * @param root Temporary project root.
 * @param path Project-relative file name.
 * @param content Exact fixture bytes.
 * @returns The absolute file path.
 */
function write(root: string, path: string, content: string): string {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

/**
 * Seed a two-fractal fixture with real extracted references.
 * @param productForward Whether a product file also carries the forward edge.
 * @returns Root and suffix-free verification helper path.
 */
async function fixture(productForward = false): Promise<{ root: string; helper: string }> {
  const root = mkdtempSync(join(tmpdir(), 'filid-verification-organ-'));
  roots.push(root);
  for (const module of ['', 'left', 'right']) {
    write(root, join(module, 'INTENT.md'), '# Module\n## Purpose\nOwn this contract.');
    write(root, join(module, 'DETAIL.md'), '# Contract\n## Requirements\nStable evidence.');
    write(root, join(module, 'index.ts'), 'export {};');
  }
  write(root, 'right/value.ts', "import '../left/index.js'; export const value = 1;");
  write(root, 'left/value.ts', productForward ? "import '../right/value.js';" : 'export const value = 1;');
  const helper = write(root, 'left/__tests__/support.ts', "import '../../right/value.js';");
  write(root, 'left/__tests__/value.spec.ts', "describe('value', () => { it('works', () => {}); });");
  await seedFacts(root);
  return { root, helper };
}

/**
 * Snapshot the fixture with a chosen verification organ list.
 * @param root Seeded project root.
 * @param names Directory names to classify as verification organs.
 * @returns Snapshot using exactly that directory declaration.
 */
async function snapshot(root: string, names: string[]) {
  return createProjectSnapshot(root, createAdapterRegistry(), {
    ...createDefaultConfig(), verification: { organNames: names },
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('verification organ paths', () => {
  it('(a) exempts suffix-free internal imports only beneath declared organs', async () => {
    const { root, helper } = await fixture();
    const enabled = await snapshot(root, ['__tests__']);
    const disabled = await snapshot(root, []);
    expect(enabled.verificationPaths).toContain(helper);
    expect(disabled.verificationPaths).not.toContain(helper);
    expect(checkExternalImportBoundary({ snapshot: enabled })).toHaveLength(0);
    expect(checkExternalImportBoundary({ snapshot: disabled })).toHaveLength(1);
  });

  it('(b) removes verification-only cycles while preserving product cycles', async () => {
    const { root, helper } = await fixture();
    expect((await snapshot(root, ['__tests__'])).dependencyGraph.cycles).toHaveLength(0);
    expect((await snapshot(root, [])).dependencyGraph.cycles).toHaveLength(1);
    writeFileSync(helper, 'export {};');
    write(root, 'left/value.ts', "import '../right/value.js';");
    await seedFacts(root);
    expect((await snapshot(root, ['__tests__'])).dependencyGraph.cycles).toHaveLength(1);
    expect((await snapshot(root, [])).dependencyGraph.cycles).toHaveLength(1);
  });

  it('(b-mixed) retains cycles with mixed verification and product evidence', async () => {
    const { root } = await fixture(true);
    expect((await snapshot(root, ['__tests__'])).dependencyGraph.cycles).toHaveLength(1);
    expect((await snapshot(root, [])).dependencyGraph.cycles).toHaveLength(1);
  });

  it('(c) preserves adapter verification roles and case counts', async () => {
    const { root, helper } = await fixture();
    const enabled = await snapshot(root, ['__tests__']);
    const disabled = await snapshot(root, []);
    expect(enabled.verification.files).toHaveLength(1);
    expect(enabled.verification.files[0]).toMatchObject({ role: 'spec-document', count: { exactCount: 1 } });
    expect(enabled.verification.files).toEqual(disabled.verification.files);
    expect(enabled.verification.files.map((file) => file.path)).not.toContain(helper);
  });
});
