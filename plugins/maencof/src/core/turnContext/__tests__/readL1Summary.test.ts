import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  L1_EXCERPT_MAX_CHARS,
  L1_GIST_MAX_CHARS,
} from '../../../constants/performance.js';
import { readL1NodesSummary } from '../readL1Summary.js';

const NO_GIST_MARKER = ' ⚠ no gist';

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
    gist?: string;
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
  it('uses the gist frontmatter field when present', () => {
    const gist = 'definition-first, abstract-to-concrete, density-focused';
    writeFileSync(
      join(vaultDir, '01_Core', 'preferences.md'),
      `---\nlayer: 1\ntitle: Preferences\ngist: ${gist}\ntags: [preferences, core]\n---\n# Preferences\n\nA long descriptive body that must NOT appear in the turn summary.`,
      'utf-8',
    );
    writeIndex([
      {
        layer: 1,
        path: '01_Core/preferences.md',
        title: 'Preferences',
        tags: ['preferences', 'core'],
      },
    ]);

    const summary = readL1NodesSummary(vaultDir);
    expect(summary).toBe(`[Preferences]: ${gist} | tags: preferences,core`);
    expect(summary).not.toContain('descriptive body');
    expect(summary).not.toContain(NO_GIST_MARKER);
    expect(summary).not.toContain('… (truncated)');
  });

  it('caps the injected gist at L1_GIST_MAX_CHARS', () => {
    const longGist = 'z'.repeat(L1_GIST_MAX_CHARS + 72);
    writeFileSync(
      join(vaultDir, '01_Core', 'cap.md'),
      `---\nlayer: 1\ntitle: Cap\ngist: ${longGist}\n---\nBody without the capped character.`,
      'utf-8',
    );
    writeIndex([{ layer: 1, path: '01_Core/cap.md', title: 'Cap' }]);

    const summary = readL1NodesSummary(vaultDir);
    expect(summary).toContain('z'.repeat(L1_GIST_MAX_CHARS));
    expect(summary).not.toContain('z'.repeat(L1_GIST_MAX_CHARS + 1));
  });

  it('prefers the gist over a body longer than the excerpt cap', () => {
    const body = 'q'.repeat(L1_EXCERPT_MAX_CHARS + 200);
    writeFileSync(
      join(vaultDir, '01_Core', 'big-gist.md'),
      `---\nlayer: 1\ntitle: BigGist\ngist: compact\n---\n${body}`,
      'utf-8',
    );
    writeIndex([{ layer: 1, path: '01_Core/big-gist.md', title: 'BigGist' }]);

    const summary = readL1NodesSummary(vaultDir);
    expect(summary).toBe('[BigGist]: compact');
    expect(summary).not.toContain('… (truncated)');
    expect(summary).not.toContain(NO_GIST_MARKER);
  });

  it('falls back to the body excerpt with a no-gist marker when gist is absent', () => {
    // Body over the old 150-char cut, no gist frontmatter — regression case.
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
    expect(summary).toContain(NO_GIST_MARKER);
    expect(summary).toContain('| tags: identity,core,name');
  });

  it('truncates the fallback body and marks it when it exceeds L1_EXCERPT_MAX_CHARS', () => {
    const body = 'a'.repeat(L1_EXCERPT_MAX_CHARS + 100);
    writeFileSync(
      join(vaultDir, '01_Core', 'big.md'),
      `---\nlayer: 1\ntitle: Big\n---\n${body}`,
      'utf-8',
    );
    writeIndex([{ layer: 1, path: '01_Core/big.md', title: 'Big' }]);

    const summary = readL1NodesSummary(vaultDir);
    expect(summary).toContain('… (truncated)');
    expect(summary).toContain(NO_GIST_MARKER);
    const line = summary.split('\n').find((l) => l.startsWith('[Big]:')) ?? '';
    expect(line.length).toBeLessThanOrEqual(
      '[Big]: '.length + L1_EXCERPT_MAX_CHARS + NO_GIST_MARKER.length,
    );
  });

  it('returns an empty string when no L1 nodes exist', () => {
    writeIndex([{ layer: 2, path: '02_Derived/x.md', title: 'X' }]);
    expect(readL1NodesSummary(vaultDir)).toBe('');
  });

  it('uses the indexed node gist without reading the file', () => {
    // Node carries a gist but the file is never written — proves the index short-circuit.
    writeIndex([
      {
        layer: 1,
        path: '01_Core/missing.md',
        title: 'Indexed',
        gist: 'indexed compact gist',
        tags: ['core'],
      },
    ]);
    expect(readL1NodesSummary(vaultDir)).toBe(
      '[Indexed]: indexed compact gist | tags: core',
    );
  });
});
