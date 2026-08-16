import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { collectDocumentEvidence } from '../../../core/projectSnapshot/evidence/collectDocumentEvidence.js';
import {
  type NodeEntry,
  buildFractalTree,
} from '../../../core/tree/fractalTree/index.js';
import type { CategoryType } from '../../../types/fractal.js';

const roots: string[] = [];

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function makeProject(): string {
  const root = mkdtempSync(join(tmpdir(), 'filid-doc-evidence-'));
  roots.push(root);
  return root;
}

const entry = (
  path: string,
  type: CategoryType,
  hasIntentMd = false,
  hasDetailMd = false,
): NodeEntry => ({
  path,
  name: path.split('/').pop() ?? path,
  type,
  hasIntentMd,
  hasDetailMd,
});

const boundaries = [
  '## Boundaries',
  '### Always do',
  '- Test',
  '### Ask first',
  '- Review',
  '### Never do',
  '- Skip tests',
];

function intentFindings(
  root: string,
  tree: ReturnType<typeof buildFractalTree>,
) {
  return tree.nodes.get(root)!.documentEvidence!.findings;
}

describe('collectDocumentEvidence derivable checks', () => {
  it('flags a relative path token that resolves to nothing', () => {
    const root = makeProject();
    writeFileSync(
      join(root, 'INTENT.md'),
      [
        '# app',
        '## Conventions',
        '- `ghost/file.ts` holds the parser.',
        ...boundaries,
      ].join('\n'),
    );
    const tree = buildFractalTree([entry(root, 'fractal', true)]);
    collectDocumentEvidence(tree);
    expect(intentFindings(root, tree)).toContainEqual(
      expect.objectContaining({
        rule: 'stale-path',
        severity: 'warning',
        document: 'intent',
      }),
    );
  });

  it('does not flag a path token that exists on disk', () => {
    const root = makeProject();
    mkdirSync(join(root, 'sub'));
    writeFileSync(join(root, 'sub', 'real.ts'), 'export {};\n');
    writeFileSync(
      join(root, 'INTENT.md'),
      [
        '# app',
        '## Conventions',
        '- `sub/real.ts` holds the parser.',
        ...boundaries,
      ].join('\n'),
    );
    const tree = buildFractalTree([entry(root, 'fractal', true)]);
    collectDocumentEvidence(tree);
    expect(
      intentFindings(root, tree).filter((f) => f.rule === 'stale-path'),
    ).toHaveLength(0);
  });

  it('skips exemption sections when checking stale paths', () => {
    const root = makeProject();
    writeFileSync(join(root, 'INTENT.md'), ['# app', ...boundaries].join('\n'));
    writeFileSync(
      join(root, 'DETAIL.md'),
      [
        '# app contract',
        '## Requirements',
        '- r',
        '## API Contracts',
        '- c',
        '## Acceptance Criteria',
        '### AC-app — behavior',
        '- ok',
        '## Boundary Exemptions',
        '### `missing/dir` — legacy target',
        '- **Consumers**: `consumer.ts`',
        '- **Direct import**: `allowed`',
        '- **Reason**: kept for the test.',
        '## Last Updated',
        '2026-08-16',
      ].join('\n'),
    );
    const tree = buildFractalTree([entry(root, 'fractal', true, true)]);
    collectDocumentEvidence(tree);
    const detailStale = intentFindings(root, tree).filter(
      (f) => f.rule === 'stale-path' && f.document === 'detail',
    );
    expect(detailStale).toHaveLength(0);
  });

  it('flags a section naming half or more of the node children', () => {
    const root = makeProject();
    const organNames = ['components', 'utils', 'hooks', 'lib'];
    for (const name of organNames) mkdirSync(join(root, name));
    writeFileSync(
      join(root, 'INTENT.md'),
      [
        '# app',
        '## Conventions',
        '- `components/` and `utils/` do the work.',
        ...boundaries,
      ].join('\n'),
    );
    const tree = buildFractalTree([
      entry(root, 'fractal', true),
      ...organNames.map((name) => entry(join(root, name), 'organ')),
    ]);
    collectDocumentEvidence(tree);
    expect(intentFindings(root, tree)).toContainEqual(
      expect.objectContaining({
        rule: 'derivable-structure',
        severity: 'warning',
        document: 'intent',
      }),
    );
  });

  it('suppresses the structure finding when an enumeration finding exists', () => {
    const root = makeProject();
    const organNames = ['components', 'utils', 'hooks', 'lib', 'styles'];
    for (const name of organNames) mkdirSync(join(root, name));
    writeFileSync(
      join(root, 'INTENT.md'),
      [
        '# app',
        '## Conventions',
        '- `components/`, `utils/` and `hooks/` do the work.',
        ...boundaries,
      ].join('\n'),
    );
    const tree = buildFractalTree([
      entry(root, 'fractal', true),
      ...organNames.map((name) => entry(join(root, name), 'organ')),
    ]);
    collectDocumentEvidence(tree);
    const findings = intentFindings(root, tree);
    expect(findings).toContainEqual(
      expect.objectContaining({ rule: 'derivable-content' }),
    );
    expect(
      findings.filter((f) => f.rule === 'derivable-structure'),
    ).toHaveLength(0);
  });
});
