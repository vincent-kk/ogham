import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform/compat';
import { afterAll, describe, expect, it } from 'vitest';

import { UNTRACKED_CONFIG_FILES } from '../../constants/files.js';
import { ensureSeiriDir } from '../utils/ensureSeiriDir.js';

/**
 * The ignore file has to keep pace with what `.seiri/` holds.
 *
 * A project that ran an older seiri already has the file, so "write it
 * once, then never touch it" means a member added later never reaches an
 * existing project — and the first untracked file nobody listed shows up
 * in `git status`, or in a commit. Backfilling only what is missing closes
 * that without overwriting anything.
 *
 * The header is what marks the file as ours. A project that wrote its own
 * rules there meant them, and is left alone.
 */
const HEADER = '# Session-scoped seiri state — never committed.';

const createdRoots: string[] = [];

afterAll(() => {
  for (const root of createdRoots)
    rmSync(root, { recursive: true, force: true });
});

/** A throwaway repository root, with `.git` so the walk-up stops here. */
function makeRepoRoot(): string {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-ensure-'));
  createdRoots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  return root;
}

function readIgnore(root: string): string {
  return readFileSync(portableJoin(root, '.seiri', '.gitignore'), 'utf8');
}

describe('ensureSeiriDir', () => {
  it('lists every untracked member when it writes the file', () => {
    const root = makeRepoRoot();
    ensureSeiriDir(root);

    const lines = readIgnore(root).split('\n');
    for (const member of UNTRACKED_CONFIG_FILES)
      expect(lines).toContain(member);
  });

  it('backfills a member missing from an ignore file it wrote earlier', () => {
    const root = makeRepoRoot();
    mkdirSync(portableJoin(root, '.seiri'));
    writeFileSync(
      portableJoin(root, '.seiri', '.gitignore'),
      `${HEADER}\nruntime.json\nsession-signals.json\n`,
    );

    ensureSeiriDir(root);

    const lines = readIgnore(root).split('\n');
    for (const member of UNTRACKED_CONFIG_FILES)
      expect(lines).toContain(member);
    expect(lines).toContain('runtime.json');
    expect(lines).toContain('session-signals.json');
  });

  it('does not rewrite an ignore file that already lists everything', () => {
    const root = makeRepoRoot();
    ensureSeiriDir(root);
    const ignorePath = portableJoin(root, '.seiri', '.gitignore');
    const longAgo = new Date(Date.now() - 60_000);
    utimesSync(ignorePath, longAgo, longAgo);

    ensureSeiriDir(root);

    // ensureSeiriDir runs on every write path; rewriting a complete file
    // each time would be pure I/O. Asserted as "still stale" rather than an
    // exact stamp — `mtimeMs` comes back rounded from the filesystem's own
    // resolution, so an equality check fails on a sub-millisecond drift that
    // has nothing to do with whether a write happened.
    expect(statSync(ignorePath).mtimeMs).toBeLessThan(Date.now() - 30_000);
  });

  it('leaves an ignore file it did not write exactly as found', () => {
    const root = makeRepoRoot();
    mkdirSync(portableJoin(root, '.seiri'));
    const handWritten = '# my own rules\n*.tmp\n';
    writeFileSync(portableJoin(root, '.seiri', '.gitignore'), handWritten);

    ensureSeiriDir(root);

    expect(readIgnore(root)).toBe(handWritten);
  });
});
