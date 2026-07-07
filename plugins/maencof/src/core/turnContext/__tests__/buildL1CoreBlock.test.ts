import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildL1CoreBlock } from '../buildL1CoreBlock.js';

let vaultDir: string;

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `maencof-l1-full-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
  mkdirSync(join(vaultDir, '01_Core'), { recursive: true });
  mkdirSync(join(vaultDir, '02_Derived'), { recursive: true });
});

afterEach(() => {
  rmSync(vaultDir, { recursive: true, force: true });
});

function writeIndex(
  nodes: Array<{ layer?: number; path?: string; title?: string }>,
): void {
  writeFileSync(
    join(vaultDir, '.maencof', 'nodes.json'),
    JSON.stringify(nodes),
    'utf-8',
  );
  writeFileSync(
    join(vaultDir, '.maencof', 'graph-meta.json'),
    JSON.stringify({
      schemaVersion: 2,
      builtAt: 'x',
      nodeCount: nodes.length,
      edgeCount: 0,
    }),
    'utf-8',
  );
}

describe('buildL1CoreBlock', () => {
  it('injects the full L1 body verbatim, frontmatter stripped and untruncated', () => {
    const body = [
      '# Identity',
      '',
      '## Section A',
      'x'.repeat(600),
      '',
      '## Final Section',
      'LAST_LINE_MARKER_ABCDEF',
    ].join('\n');
    writeFileSync(
      join(vaultDir, '01_Core', 'identity.md'),
      `---\nlayer: 1\ntitle: Identity\ngist: short summary\ntags: [identity]\n---\n${body}`,
      'utf-8',
    );
    writeIndex([{ layer: 1, path: '01_Core/identity.md', title: 'Identity' }]);

    const block = buildL1CoreBlock(vaultDir);
    expect(block).toContain('<l1-core-full>');
    expect(block).toContain('</l1-core-full>');
    expect(block).toContain('<doc title="Identity">');
    // Structure preserved (not flattened) and body complete (not truncated).
    expect(block).toContain('## Final Section');
    expect(block).toContain('LAST_LINE_MARKER_ABCDEF');
    // Frontmatter stripped.
    expect(block).not.toContain('gist: short summary');
    expect(block).not.toContain('layer: 1');
  });

  it('emits one <doc> section per L1 document', () => {
    writeFileSync(
      join(vaultDir, '01_Core', 'a.md'),
      '---\nlayer: 1\ntitle: Doc One\n---\nAlpha content',
      'utf-8',
    );
    writeFileSync(
      join(vaultDir, '01_Core', 'b.md'),
      '---\nlayer: 1\ntitle: Doc Two\n---\nBeta content',
      'utf-8',
    );
    writeIndex([
      { layer: 1, path: '01_Core/a.md', title: 'Doc One' },
      { layer: 1, path: '01_Core/b.md', title: 'Doc Two' },
    ]);

    const block = buildL1CoreBlock(vaultDir);
    expect(block).toContain('<doc title="Doc One">');
    expect(block).toContain('Alpha content');
    expect(block).toContain('<doc title="Doc Two">');
    expect(block).toContain('Beta content');
  });

  it('ignores non-L1 nodes', () => {
    writeFileSync(
      join(vaultDir, '02_Derived', 'x.md'),
      '---\nlayer: 2\ntitle: Derived\n---\nDerived body',
      'utf-8',
    );
    writeIndex([{ layer: 2, path: '02_Derived/x.md', title: 'Derived' }]);
    expect(buildL1CoreBlock(vaultDir)).toBe('');
  });

  it('returns an empty string when no L1 nodes exist', () => {
    writeIndex([]);
    expect(buildL1CoreBlock(vaultDir)).toBe('');
  });
});
