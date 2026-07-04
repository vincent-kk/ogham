import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { L1_EXCERPT_MAX_CHARS } from '../../../constants/performance.js';
import { readL1NodesSummary } from '../readL1Summary.js';

let vaultDir: string;

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `maencof-l1-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
  mkdirSync(join(vaultDir, '01_Core'), { recursive: true });
});

afterEach(() => {
  rmSync(vaultDir, { recursive: true, force: true });
});

function writeIndex(
  nodes: Array<{
    layer?: number;
    path?: string;
    title?: string;
    tags?: string[];
  }>,
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

describe('readL1NodesSummary', () => {
  it('injects an L1 doc longer than the old 150-char excerpt in full', () => {
    // Body over 150 chars mirroring identity.md's structure — regression case for the old per-doc 150-char cut.
    const identity = [
      '---',
      'layer: 1',
      'title: Identity',
      '---',
      '# Identity',
      '',
      '- **Name**: Vincent Kelvin',
      '- **Occupation**: Software Engineer',
      '- **Role**: technical review, hands-on development, operations',
      '- **Main interests**: AI-driven web/app/server development, AI infrastructure, LLM research',
      '- **Long-term goal**: deepening AI technical expertise',
      '- **Learning style**: theory- and structure-oriented',
      '- **Decision criteria**: data/evidence-based with practicality and ROI focus',
      '- **Daily routine**: defined and discovered through use',
    ].join('\n');
    writeFileSync(join(vaultDir, '01_Core', 'identity.md'), identity, 'utf-8');
    writeIndex([
      {
        layer: 1,
        path: '01_Core/identity.md',
        title: 'Identity',
        tags: ['identity', 'core', 'name'],
      },
    ]);

    const summary = readL1NodesSummary(vaultDir);
    expect(summary).toContain('[Identity]:');
    expect(summary).toContain(
      '**Daily routine**: defined and discovered through use',
    );
    expect(summary).not.toContain('… (truncated)');
    expect(summary).toContain('| tags: identity,core,name');
  });

  it('appends a truncation marker when an L1 doc exceeds L1_EXCERPT_MAX_CHARS', () => {
    const body = 'a'.repeat(L1_EXCERPT_MAX_CHARS + 100);
    writeFileSync(
      join(vaultDir, '01_Core', 'big.md'),
      `---\nlayer: 1\ntitle: Big\n---\n${body}`,
      'utf-8',
    );
    writeIndex([{ layer: 1, path: '01_Core/big.md', title: 'Big' }]);

    const summary = readL1NodesSummary(vaultDir);
    expect(summary).toContain('… (truncated)');
    const line = summary.split('\n').find((l) => l.startsWith('[Big]:')) ?? '';
    expect(line.length).toBeLessThanOrEqual(
      '[Big]: '.length + L1_EXCERPT_MAX_CHARS,
    );
  });

  it('returns an empty string when no L1 nodes exist', () => {
    writeIndex([{ layer: 2, path: '02_Derived/x.md', title: 'X' }]);
    expect(readL1NodesSummary(vaultDir)).toBe('');
  });
});
