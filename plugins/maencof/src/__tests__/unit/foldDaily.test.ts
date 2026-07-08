/**
 * @file foldDaily.test.ts
 * @description foldDaily unit tests — fold base discovery and fold-commit with restore
 */
import { spawnCli } from '@ogham/cross-platform/spawn';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatDate } from '../../core/dateFormat/dateFormat.js';
import {
  findFoldBase,
  isAutoCommitSubject,
  tryFoldCommit,
} from '../../hooks/utils/vaultCommitter/helpers/foldDaily/foldDaily.js';

vi.mock('@ogham/cross-platform/spawn', () => ({
  spawnCli: vi.fn(),
}));

const mockSpawnCli = vi.mocked(spawnCli);

const ok = (stdout = '') => ({
  code: 0,
  stdout,
  stderr: '',
  timedOut: false,
  spawnError: undefined,
});

const err = (stderr = 'fail') => ({
  code: 1,
  stdout: '',
  stderr,
  timedOut: false,
  spawnError: undefined,
});

const TODAY = '2026-07-08';
const YESTERDAY = '2026-07-07';
const AUTO = 'chore(maencof): session wrap [01_Core] (2026-07-08 10:05)';
const LEGACY_AUTO = 'chore(maencof): 2026_07_08:10_06_36_session_wrap';
const MANUAL = 'docs: hand-written commit';

interface FakeCommit {
  subject: string;
  day: string;
  parent?: string;
}

function setupGraph(opts: {
  head?: string | null;
  commits?: Record<string, FakeCommit>;
  commitFails?: boolean;
  resetFailsFor?: string;
}) {
  const {
    head = null,
    commits = {},
    commitFails = false,
    resetFailsFor,
  } = opts;
  mockSpawnCli.mockImplementation(async (_bin, args) => {
    const a = args as readonly string[];
    if (a[0] === 'rev-parse') {
      const ref = a[a.length - 1];
      if (ref === 'HEAD') return head ? ok(`${head}\n`) : err('unborn HEAD');
      if (ref.endsWith('^')) {
        const parent = commits[ref.slice(0, -1)]?.parent;
        return parent ? ok(`${parent}\n`) : err('no parent');
      }
      return ok(`${ref}\n`);
    }
    if (a[0] === 'log') {
      const rev = a[a.length - 1];
      const commit = commits[rev];
      if (!commit) return err('bad revision');
      return a.includes('--format=%s')
        ? ok(`${commit.subject}\n`)
        : ok(`${commit.day}\n`);
    }
    if (a[0] === 'reset')
      return resetFailsFor === a[a.length - 1] ? err('reset failed') : ok();
    if (a[0] === 'diff') return ok('01_Core/x.md\n');
    if (a[0] === 'commit') return commitFails ? err('boom') : ok();
    return ok();
  });
}

function callsOf(cmd: string): string[][] {
  return mockSpawnCli.mock.calls
    .map((call) => call[1] as string[])
    .filter((args) => args[0] === cmd);
}

beforeEach(() => {
  mockSpawnCli.mockReset();
});

describe('isAutoCommitSubject', () => {
  it('matches all managed auto-commit subject formats', () => {
    expect(isAutoCommitSubject(AUTO)).toBe(true);
    expect(isAutoCommitSubject(LEGACY_AUTO)).toBe(true);
    expect(
      isAutoCommitSubject(
        'chore(vault): auto-commit knowledge tree [01_Core] (2026-07-08 10:05)',
      ),
    ).toBe(true);
    expect(isAutoCommitSubject('chore: daily knowledge tree fold')).toBe(true);
    expect(
      isAutoCommitSubject(
        'chore(session): auto-commit on session end (prompt_input_exit)',
      ),
    ).toBe(true);
  });

  it('does not match hand-written commit subjects', () => {
    expect(isAutoCommitSubject(MANUAL)).toBe(false);
    expect(isAutoCommitSubject('feat(maencof): session wrapper')).toBe(false);
  });

  it('matches a custom template prefix via startsWith and ignores blank prefixes', () => {
    expect(isAutoCommitSubject('vault: wrap [01_Core]', 'vault: wrap')).toBe(
      true,
    );
    expect(isAutoCommitSubject('docs: vault: wrap note', 'vault: wrap')).toBe(
      false,
    );
    expect(isAutoCommitSubject(MANUAL, '   ')).toBe(false);
  });
});

describe('findFoldBase', () => {
  it('returns null on unborn HEAD', async () => {
    setupGraph({ head: null });
    expect(await findFoldBase('/vault', TODAY)).toBeNull();
  });

  it('returns null when HEAD is not an auto commit', async () => {
    setupGraph({
      head: 'c2',
      commits: { c2: { subject: MANUAL, day: TODAY, parent: 'c1' } },
    });
    expect(await findFoldBase('/vault', TODAY)).toBeNull();
  });

  it('returns null when HEAD is an auto commit from another day', async () => {
    setupGraph({
      head: 'c2',
      commits: { c2: { subject: AUTO, day: YESTERDAY, parent: 'c1' } },
    });
    expect(await findFoldBase('/vault', TODAY)).toBeNull();
  });

  it('returns the first non-auto commit below consecutive today-autos', async () => {
    setupGraph({
      head: 'c3',
      commits: {
        c3: { subject: AUTO, day: TODAY, parent: 'c2' },
        c2: { subject: LEGACY_AUTO, day: TODAY, parent: 'c1' },
        c1: { subject: MANUAL, day: YESTERDAY, parent: 'c0' },
      },
    });
    expect(await findFoldBase('/vault', TODAY)).toBe('c1');
  });

  it("stops at yesterday's auto commit without folding across it", async () => {
    setupGraph({
      head: 'c2',
      commits: {
        c2: { subject: AUTO, day: TODAY, parent: 'c1' },
        c1: { subject: AUTO, day: YESTERDAY, parent: 'c0' },
      },
    });
    expect(await findFoldBase('/vault', TODAY)).toBe('c1');
  });

  it('returns null when the walk reaches the repository root', async () => {
    setupGraph({
      head: 'c1',
      commits: { c1: { subject: AUTO, day: TODAY } },
    });
    expect(await findFoldBase('/vault', TODAY)).toBeNull();
  });
});

describe('tryFoldCommit', () => {
  const today = formatDate(new Date());

  it('returns false without touching the branch when there is nothing to fold', async () => {
    setupGraph({
      head: 'c2',
      commits: { c2: { subject: MANUAL, day: today, parent: 'c1' } },
    });
    expect(await tryFoldCommit('/vault', ['01_Core/'])).toBe(false);
    expect(callsOf('reset')).toHaveLength(0);
    expect(callsOf('commit')).toHaveLength(0);
  });

  it('resets softly to the base and commits once', async () => {
    setupGraph({
      head: 'c3',
      commits: {
        c3: { subject: AUTO, day: today, parent: 'c2' },
        c2: { subject: AUTO, day: today, parent: 'c1' },
        c1: { subject: MANUAL, day: today, parent: 'c0' },
      },
    });
    expect(await tryFoldCommit('/vault', ['01_Core/'])).toBe(true);
    expect(callsOf('reset')).toEqual([['reset', '--soft', 'c1']]);
    expect(callsOf('commit')).toHaveLength(1);
  });

  it('restores the original HEAD and rethrows when the fold commit fails', async () => {
    setupGraph({
      head: 'c2',
      commits: {
        c2: { subject: AUTO, day: today, parent: 'c1' },
        c1: { subject: MANUAL, day: today, parent: 'c0' },
      },
      commitFails: true,
    });
    await expect(tryFoldCommit('/vault', ['01_Core/'])).rejects.toThrow(
      /git commit failed/,
    );
    expect(callsOf('reset')).toEqual([
      ['reset', '--soft', 'c1'],
      ['reset', '--soft', 'c2'],
    ]);
  });

  it('folds commits produced by a custom message template', async () => {
    setupGraph({
      head: 'c2',
      commits: {
        c2: {
          subject: 'vault: wrap [01_Core] (2026-07-08)',
          day: today,
          parent: 'c1',
        },
        c1: { subject: MANUAL, day: today, parent: 'c0' },
      },
    });
    const folded = await tryFoldCommit(
      '/vault',
      ['01_Core/'],
      'vault: wrap [{dirs}] ({date})',
    );
    expect(folded).toBe(true);
    expect(callsOf('reset')).toEqual([['reset', '--soft', 'c1']]);
  });

  it('returns false when the soft reset itself fails', async () => {
    setupGraph({
      head: 'c2',
      commits: {
        c2: { subject: AUTO, day: today, parent: 'c1' },
        c1: { subject: MANUAL, day: today, parent: 'c0' },
      },
      resetFailsFor: 'c1',
    });
    expect(await tryFoldCommit('/vault', ['01_Core/'])).toBe(false);
    expect(callsOf('commit')).toHaveLength(0);
  });
});
