import { describe, expect, it } from 'vitest';

import {
  REVIEW_ENTRY_STAGES,
  WORKTREE_DISPOSITIONS,
} from '../../../constants/reviewState.js';
import { classifyWorktreePaths } from '../../../mcp/tools/reviewState/assess/classifyWorktreePaths.js';
import { matchesGeneratedPath } from '../../../mcp/tools/reviewState/assess/matchesGeneratedPath.js';
import { parseGitStatusPaths } from '../../../mcp/tools/reviewState/assess/parseGitStatusPaths.js';
import { resolveEntryStage } from '../../../mcp/tools/reviewState/assess/resolveEntryStage.js';

const GENERATED = ['plugins/*/bridge', 'plugins/*/plugin.json'];
const NO_ENTRY_POINT_EVIDENCE = {
  hasReValidate: false,
  hasJustifications: false,
  hasFixRequests: false,
  hasPullRequest: false,
};

describe('matchesGeneratedPath — one segment per wildcard', () => {
  it('covers files nested under a matched directory', () => {
    expect(
      matchesGeneratedPath('plugins/*/bridge', 'plugins/filid/bridge/mcp.mjs'),
    ).toBe(true);
  });

  it('does not cover a sibling file that merely shares the name', () => {
    expect(
      matchesGeneratedPath('plugins/*/bridge', 'plugins/filid/src/bridge.ts'),
    ).toBe(false);
  });

  it('matches the declared directory itself', () => {
    expect(
      matchesGeneratedPath('plugins/*/bridge', 'plugins/filid/bridge'),
    ).toBe(true);
  });

  it('rejects a path shorter than the pattern', () => {
    expect(matchesGeneratedPath('plugins/*/bridge', 'plugins/filid')).toBe(
      false,
    );
  });

  it('does not let a wildcard span two segments', () => {
    expect(matchesGeneratedPath('plugins/*/bridge', 'plugins/a/b/bridge')).toBe(
      false,
    );
  });
});

describe('classifyWorktreePaths — first match wins', () => {
  it('classes module documents as documents even under a generated path', () => {
    const result = classifyWorktreePaths(
      ['plugins/filid/bridge/INTENT.md'],
      GENERATED,
    );

    expect(result.documents).toEqual(['plugins/filid/bridge/INTENT.md']);
    expect(result.generated).toEqual([]);
  });

  it('separates generated, document and source paths', () => {
    const result = classifyWorktreePaths(
      [
        'plugins/filid/bridge/mcp-server.cjs',
        'plugins/filid/DETAIL.md',
        'plugins/filid/src/core/index.ts',
      ],
      GENERATED,
    );

    expect(result.generated).toEqual(['plugins/filid/bridge/mcp-server.cjs']);
    expect(result.documents).toEqual(['plugins/filid/DETAIL.md']);
    expect(result.source).toEqual(['plugins/filid/src/core/index.ts']);
    expect(result.disposition).toBe(WORKTREE_DISPOSITIONS.SOURCE_DIRTY);
  });

  it('treats every non-document path as source when nothing is declared', () => {
    const result = classifyWorktreePaths(
      ['plugins/filid/bridge/mcp-server.cjs'],
      [],
    );

    expect(result.source).toEqual(['plugins/filid/bridge/mcp-server.cjs']);
    expect(result.disposition).toBe(WORKTREE_DISPOSITIONS.SOURCE_DIRTY);
  });

  it('reports generated-only and documents-only dispositions', () => {
    expect(
      classifyWorktreePaths(['plugins/filid/bridge/x.mjs'], GENERATED)
        .disposition,
    ).toBe(WORKTREE_DISPOSITIONS.GENERATED_ONLY);
    expect(
      classifyWorktreePaths(['plugins/filid/INTENT.md'], GENERATED).disposition,
    ).toBe(WORKTREE_DISPOSITIONS.DOCUMENTS_ONLY);
    expect(classifyWorktreePaths([], GENERATED).disposition).toBe(
      WORKTREE_DISPOSITIONS.CLEAN,
    );
  });
});

describe('parseGitStatusPaths — NUL-delimited porcelain', () => {
  it('reads the path out of each record', () => {
    expect(parseGitStatusPaths(' M src/a.ts\0?? src/b.ts\0')).toEqual([
      'src/a.ts',
      'src/b.ts',
    ]);
  });

  it('skips the source record that follows a rename', () => {
    expect(parseGitStatusPaths('R  new.ts\0old.ts\0 M other.ts\0')).toEqual([
      'new.ts',
      'other.ts',
    ]);
  });

  it('returns nothing for a clean worktree', () => {
    expect(parseGitStatusPaths('')).toEqual([]);
  });
});

describe('resolveEntryStage — priority order is the contract', () => {
  it('reports complete when a verdict was recorded', () => {
    expect(
      resolveEntryStage({
        ...NO_ENTRY_POINT_EVIDENCE,
        hasReValidate: true,
        hasJustifications: true,
        hasFixRequests: true,
        hasPullRequest: true,
      }),
    ).toBe(REVIEW_ENTRY_STAGES.COMPLETE);
  });

  it('prefers revalidate over resolve when justifications exist', () => {
    expect(
      resolveEntryStage({
        ...NO_ENTRY_POINT_EVIDENCE,
        hasJustifications: true,
        hasFixRequests: true,
      }),
    ).toBe(REVIEW_ENTRY_STAGES.REVALIDATE);
  });

  it('enters resolve when only fix requests exist', () => {
    expect(
      resolveEntryStage({ ...NO_ENTRY_POINT_EVIDENCE, hasFixRequests: true }),
    ).toBe(REVIEW_ENTRY_STAGES.RESOLVE);
  });

  it('enters review when a PR exists with no review artifacts', () => {
    expect(
      resolveEntryStage({ ...NO_ENTRY_POINT_EVIDENCE, hasPullRequest: true }),
    ).toBe(REVIEW_ENTRY_STAGES.REVIEW);
  });

  it('falls back to pr-create with no evidence at all', () => {
    expect(resolveEntryStage(NO_ENTRY_POINT_EVIDENCE)).toBe(
      REVIEW_ENTRY_STAGES.PR_CREATE,
    );
  });
});
