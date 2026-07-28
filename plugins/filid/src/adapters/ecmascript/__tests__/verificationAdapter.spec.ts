import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { evaluateVerificationPolicy } from '../../../core/verification/index.js';
import { ecmascriptVerificationAdapter } from '../index.js';

const roots: string[] = [];

function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'filid-verification-adapter-'));
  roots.push(root);
  return root;
}

function write(root: string, relativePath: string, content = ''): string {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  return path;
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('ecmascript verification adapter', () => {
  it('classifies spec and test files by verification role', async () => {
    const root = project();
    const spec = write(root, 'a.spec.ts', "it('works', () => {});");
    const test = write(root, 'a.test.js', "it('works', () => {});");

    expect(await ecmascriptVerificationAdapter.classify(spec)).toBe(
      'spec-document',
    );
    expect(await ecmascriptVerificationAdapter.classify(test)).toBe(
      'test-record',
    );
  });

  it('denies the role to a candidate holding no verification cases', async () => {
    const root = project();
    const impostor = write(
      root,
      'src/impostor.spec.ts',
      "import { a } from '../other/internal/deep.js';\nexport const b = a + 1;\n",
    );
    write(root, 'src/real.spec.ts', "it('works', () => {});");

    // Renaming production code to *.spec.ts must not buy a boundary exemption.
    expect(await ecmascriptVerificationAdapter.classify(impostor)).toBe(
      'unsupported',
    );
    expect(await ecmascriptVerificationAdapter.discover(root)).not.toContain(
      impostor,
    );
  });

  it('keeps a candidate whose case count is indeterminate', async () => {
    const root = project();
    const dynamic = write(
      root,
      'src/dynamic.spec.ts',
      "it.each(loadRows())('row', () => {});",
    );

    // Uncountable is not the same as absent.
    expect(await ecmascriptVerificationAdapter.classify(dynamic)).toBe(
      'spec-document',
    );
    expect(await ecmascriptVerificationAdapter.discover(root)).toContain(
      dynamic,
    );
  });

  it('returns unsupported for an unknown verification file', async () => {
    expect(await ecmascriptVerificationAdapter.classify('/p/a.contract')).toBe(
      'unsupported',
    );
    expect(await ecmascriptVerificationAdapter.count('/p/a.contract')).toEqual(
      expect.objectContaining({ certainty: 'unsupported' }),
    );
  });

  it('discovers supported verification files and excludes dependency dirs', async () => {
    const root = project();
    const spec = write(root, 'src/feature.spec.ts', "it('works', () => {});");
    const test = write(root, 'src/feature.test.ts', "it('works', () => {});");
    write(root, 'node_modules/pkg/ignored.test.js', "it('ignored', () => {});");
    write(root, 'src/source.ts', 'export {};');

    expect(await ecmascriptVerificationAdapter.discover(root)).toEqual([
      spec,
      test,
    ]);
  });

  it('counts 16 static parameter rows and policy rejects the spec', async () => {
    const root = project();
    const path = write(
      root,
      'src/rows.spec.ts',
      `it.each([${Array.from({ length: 16 }, (_, index) => index).join(',')}])('row', () => {});`,
    );
    const count = await ecmascriptVerificationAdapter.count(path);

    expect(count).toMatchObject({
      certainty: 'exact',
      exactCount: 16,
      knownLowerBound: 16,
    });
    const result = evaluateVerificationPolicy([
      {
        path,
        adapterId: ecmascriptVerificationAdapter.id,
        role: 'spec-document',
        count,
        ownerFractalPath: join(root, 'src'),
        contractGroupIds: [],
      },
    ]);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ ruleId: 'spec-document-case-cap' }),
    );
  });

  it('returns indeterminate for a dynamic parameter table', async () => {
    const root = project();
    const path = write(
      root,
      'src/dynamic.spec.ts',
      "it.each(loadRows())('row', () => {});",
    );

    expect(await ecmascriptVerificationAdapter.count(path)).toEqual(
      expect.objectContaining({
        certainty: 'indeterminate',
        exactCount: undefined,
      }),
    );
  });

  it('extracts unique contract markers from comments only', async () => {
    const root = project();
    const path = write(
      root,
      'src/contracts.spec.ts',
      [
        '// filid:contract AC-create',
        '/* filid:contract AC-delete */',
        "const ignored = 'filid:contract AC-string';",
        '// filid:contract AC-create',
        "it('holds a case, as a spec-document must', () => {});",
      ].join('\n'),
    );

    expect(
      await ecmascriptVerificationAdapter.extractContractGroupIds(path),
    ).toEqual(['AC-create', 'AC-delete']);
  });

  it('reuses structure detection evidence', async () => {
    const root = project();
    write(root, 'src/feature.spec.ts', "it('works', () => {});");

    expect(
      (await ecmascriptVerificationAdapter.detect(root)).confidence,
    ).toBeGreaterThan(0);
  });
});
