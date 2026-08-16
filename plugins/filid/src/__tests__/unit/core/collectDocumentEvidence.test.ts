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
        message: expect.stringContaining('section "Conventions"'),
      }),
    );
  });

  it('does not satisfy a directory-marked token with a plain file', () => {
    const root = makeProject();
    writeFileSync(join(root, 'ghost'), 'not a directory\n');
    writeFileSync(
      join(root, 'INTENT.md'),
      ['# app', '## Conventions', '- `ghost/` owns it.', ...boundaries].join(
        '\n',
      ),
    );
    const tree = buildFractalTree([entry(root, 'fractal', true)]);
    collectDocumentEvidence(tree);
    expect(intentFindings(root, tree)).toContainEqual(
      expect.objectContaining({ rule: 'stale-path' }),
    );
  });

  it('resolves dot-dot tokens from the document directory only', () => {
    const root = makeProject();
    mkdirSync(join(root, 'pkg', 'sub'), { recursive: true });
    mkdirSync(join(root, 'shared'));
    writeFileSync(join(root, 'shared', 'base.md'), '# base\n');
    writeFileSync(
      join(root, 'pkg', 'sub', 'INTENT.md'),
      [
        '# sub',
        '## Conventions',
        '- built from `../shared/base.md`.',
        ...boundaries,
      ].join('\n'),
    );
    const tree = buildFractalTree([
      entry(root, 'fractal'),
      entry(join(root, 'pkg', 'sub'), 'fractal', true),
    ]);
    collectDocumentEvidence(tree);
    expect(
      intentFindings(join(root, 'pkg', 'sub'), tree).filter(
        (f) => f.rule === 'stale-path',
      ),
    ).toHaveLength(1);
  });

  it('skips Dependencies and Last Updated sections', () => {
    const root = makeProject();
    writeFileSync(
      join(root, 'INTENT.md'),
      [
        '# app',
        '## Dependencies',
        '- `ghost/dep.js` wires it.',
        ...boundaries,
      ].join('\n'),
    );
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
        '## Last Updated',
        '2026-08-16 — removed `old/thing.md`.',
      ].join('\n'),
    );
    const tree = buildFractalTree([entry(root, 'fractal', true, true)]);
    collectDocumentEvidence(tree);
    expect(
      intentFindings(root, tree).filter((f) => f.rule === 'stale-path'),
    ).toHaveLength(0);
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
        '- **Reason**: kept for the test; see `ghost/notes.md`.',
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

  it('prefers derivable-structure over derivable-content for the same section', () => {
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
      expect.objectContaining({
        rule: 'derivable-structure',
        section: 'Conventions',
      }),
    );
    expect(findings.filter((f) => f.rule === 'derivable-content')).toHaveLength(
      0,
    );
  });

  it('keeps derivable-content for sections that do not enumerate children', () => {
    const root = makeProject();
    const organNames = ['components', 'utils', 'hooks', 'lib'];
    for (const name of organNames) mkdirSync(join(root, name));
    writeFileSync(
      join(root, 'INTENT.md'),
      [
        '# app',
        '## Conventions',
        '- `components/` and `utils/` do the work.',
        '## Rules',
        '- `docs/a.md`, `docs/b.md` and `docs/c.md` bind.',
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
      expect.objectContaining({
        rule: 'derivable-structure',
        section: 'Conventions',
      }),
    );
    expect(findings).toContainEqual(
      expect.objectContaining({ rule: 'derivable-content', section: 'Rules' }),
    );
  });

  it('resolves package-root-relative references through the ancestor chain', () => {
    const root = makeProject();
    mkdirSync(join(root, 'pkg', 'src', 'inner'), { recursive: true });
    mkdirSync(join(root, 'pkg', 'public'));
    writeFileSync(join(root, 'pkg', 'public', 'page.html'), '<p/>\n');
    writeFileSync(
      join(root, 'pkg', 'src', 'inner', 'INTENT.md'),
      [
        '# inner',
        '## Conventions',
        '- serves `public/page.html`.',
        ...boundaries,
      ].join('\n'),
    );
    const tree = buildFractalTree([
      entry(root, 'fractal'),
      entry(join(root, 'pkg', 'src', 'inner'), 'fractal', true),
    ]);
    collectDocumentEvidence(tree);
    expect(
      intentFindings(join(root, 'pkg', 'src', 'inner'), tree).filter(
        (f) => f.rule === 'stale-path',
      ),
    ).toHaveLength(0);
  });

  it('skips tokens that do not assert existence', () => {
    const root = makeProject();
    writeFileSync(
      join(root, 'INTENT.md'),
      [
        '# app',
        '## Conventions',
        '- responds with `application/json` from `core/httpClient`.',
        ...boundaries,
      ].join('\n'),
    );
    const tree = buildFractalTree([entry(root, 'fractal', true)]);
    collectDocumentEvidence(tree);
    expect(
      intentFindings(root, tree).filter((f) => f.rule === 'stale-path'),
    ).toHaveLength(0);
  });

  it('skips home-relative and variable tokens', () => {
    const root = makeProject();
    writeFileSync(
      join(root, 'INTENT.md'),
      [
        '# app',
        '## Conventions',
        '- state lives in `~/.state/config.json` and `$HOME/cache/x.json`.',
        ...boundaries,
      ].join('\n'),
    );
    const tree = buildFractalTree([entry(root, 'fractal', true)]);
    collectDocumentEvidence(tree);
    expect(
      intentFindings(root, tree).filter((f) => f.rule === 'stale-path'),
    ).toHaveLength(0);
  });

  it('flags a directory-marked token that resolves nowhere', () => {
    const root = makeProject();
    writeFileSync(
      join(root, 'INTENT.md'),
      [
        '# app',
        '## Conventions',
        '- `ghost/` owns nothing.',
        ...boundaries,
      ].join('\n'),
    );
    const tree = buildFractalTree([entry(root, 'fractal', true)]);
    collectDocumentEvidence(tree);
    expect(intentFindings(root, tree)).toContainEqual(
      expect.objectContaining({ rule: 'stale-path', section: 'Conventions' }),
    );
  });

  it('skips the History section when checking stale paths', () => {
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
        '## History',
        '- 2026-08-16 — removed `old/thing.md` and its callers.',
        '## Last Updated',
        '2026-08-16',
      ].join('\n'),
    );
    const tree = buildFractalTree([entry(root, 'fractal', true, true)]);
    collectDocumentEvidence(tree);
    expect(
      intentFindings(root, tree).filter(
        (f) => f.rule === 'stale-path' && f.document === 'detail',
      ),
    ).toHaveLength(0);
  });
});
