import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';

import {
  ensureDirectorySync,
  portableDirname,
  portableJoin,
  tmp,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  REVIEW_HANDOFF_MAX_ENTRIES,
  REVIEW_STATE_ACTIONS,
  type ReviewHandoffClass,
} from '../../../constants/reviewState.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';
import { buildHandoffSeed } from '../../../mcp/tools/reviewState/scope/buildHandoffSeed.js';
import { computeChangedScopeEvidence } from '../../../mcp/tools/reviewState/scope/computeChangedScopeEvidence.js';
import { foldHandoffScope } from '../../../mcp/tools/reviewState/scope/foldHandoffScope.js';
import { parseHandoffBlock } from '../../../mcp/tools/reviewState/scope/parseHandoffBlock.js';
import { renderHandoffMarkdown } from '../../../mcp/tools/reviewState/scope/renderHandoffMarkdown.js';
import {
  REVIEW_HANDOFF_SEED_SCHEMA,
  type ReviewHandoffSeed,
} from '../../../mcp/tools/reviewState/scope/reviewHandoffSeedSchema.js';
import { resolveReviewStatePaths } from '../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';

import { runReviewStateFixtureGit } from './reviewState/helpers/runReviewStateFixtureGit.js';

vi.mock(
  '../../../mcp/tools/reviewState/scope/computeChangedScopeEvidence.js',
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import('../../../mcp/tools/reviewState/scope/computeChangedScopeEvidence.js')
    >();
    return {
      ...actual,
      computeChangedScopeEvidence: vi.fn(actual.computeChangedScopeEvidence),
    };
  },
);

vi.mock(
  '../../../mcp/tools/reviewState/scope/parseHandoffBlock.js',
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import('../../../mcp/tools/reviewState/scope/parseHandoffBlock.js')
    >();
    return { ...actual, parseHandoffBlock: vi.fn(actual.parseHandoffBlock) };
  },
);

/** Changed-scope computation wrapper varied by handler regression cases. */
const mockedComputeChangedScopeEvidence = vi.mocked(
  computeChangedScopeEvidence,
);

/** Handoff parser wrapper used to expose one self-check diagnostic. */
const mockedParseHandoffBlock = vi.mocked(parseHandoffBlock);

/** Branch carrying the committed fixture change. */
const BRANCH = 'feature/handoff';

/** Empty complete-handoff counts varied by renderer-only cases. */
const EMPTY_HANDOFF_COUNTS: Record<ReviewHandoffClass, number> = {
  'code-change': 0,
  'config-decision': 0,
  indeterminate: 0,
  'needs-rework': 0,
  'unresolved-path': 0,
  'document-sync': 0,
};

/** Temporary FCA repository exercised by each handler case. */
let projectRoot: string;

/**
 * Write one project-relative fixture file below its ensured parent directory.
 * @param relativePath Destination relative to the temporary repository.
 * @param content Complete UTF-8 file bytes.
 * @returns Nothing after the file is written atomically.
 */
function writeProjectFile(relativePath: string, content: string): void {
  const path = portableJoin(projectRoot, relativePath);
  ensureDirectorySync(portableDirname(path));
  writeFileAtomicallySync(path, content);
}

/**
 * Validate a compact seed used to exercise rendering-only contracts.
 * @param overrides Seed fields varied by the current renderer case.
 * @returns Schema-valid handoff seed with deterministic defaults.
 */
function buildSeed(
  overrides: Partial<ReviewHandoffSeed> = {},
): ReviewHandoffSeed {
  return REVIEW_HANDOFF_SEED_SCHEMA.parse({
    schema: 1,
    snapshotHash: 'snapshot-hash',
    scope: ['src'],
    documentSync: 'committed',
    repaired: 0,
    recorded: [],
    truncated: 0,
    ...overrides,
  });
}

beforeEach(() => {
  projectRoot = mkdtempSync(portableJoin(tmp(), 'filid-review-handoff-'));
  runReviewStateFixtureGit(projectRoot, ['init', '--initial-branch=main']);
  runReviewStateFixtureGit(projectRoot, ['config', 'user.name', 'Filid Test']);
  runReviewStateFixtureGit(projectRoot, [
    'config',
    'user.email',
    'filid-test@example.test',
  ]);
  writeProjectFile(
    '.filid/config.json',
    `${JSON.stringify({
      version: '2.0',
      language: 'English',
      adapters: { mode: 'auto', enabled: [] },
      rules: {},
    })}\n`,
  );
  writeProjectFile(
    'INTENT.md',
    '## Purpose\n\nOwn the fixture module.\n\n## Conventions\n\n- Keep deterministic.\n\n## Boundaries\n\n### Always do\n\n- Preserve the contract.\n\n### Ask first\n\n- Change the boundary.\n\n### Never do\n\n- Publish artifacts.\n',
  );
  writeProjectFile(
    'DETAIL.md',
    '# Fixture contract\n\n## Requirements\n\n- Keep the value deterministic.\n\n## API Contracts\n\n- The entry point exports the value.\n\n## Acceptance Criteria\n\n### AC-fixture\n\n- The value is exported.\n\n## Last Updated\n\n2026-09-07\n',
  );
  writeProjectFile('index.ts', "export { value } from './src/value.js';\n");
  writeProjectFile('src/value.ts', "export const value = 'base';\n");
  runReviewStateFixtureGit(projectRoot, ['add', '--all']);
  runReviewStateFixtureGit(projectRoot, ['commit', '-m', 'base']);
  runReviewStateFixtureGit(projectRoot, ['checkout', '-b', BRANCH]);
  writeProjectFile('src/value.ts', "export const value = 'feature';\n");
  runReviewStateFixtureGit(projectRoot, ['add', '--all']);
  runReviewStateFixtureGit(projectRoot, ['commit', '-m', 'feature']);
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe('review_state handoff', () => {
  it('writes a parser-valid handoff for the committed owner scope', async () => {
    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.HANDOFF,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
      documentSync: 'committed',
      repaired: 2,
    });

    const markdown = readFileSync(result.data.handoffPath, 'utf8');
    const parsed = parseHandoffBlock(markdown);
    expect(markdown).toContain('## FCA Handoff');
    expect(markdown).toContain('<!-- filid:handoff v1');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.handoff).not.toBeNull();
    expect(parsed.handoff).toEqual(
      expect.objectContaining({ snapshotHash: result.summary.snapshotHash }),
    );
    expect(result.data.scope).toContain('.');
    expect(existsSync(result.data.handoffPath)).toBe(true);
  });

  it('carries production verification certainty into machine entries', async () => {
    writeProjectFile(
      '.filid/config.json',
      `${JSON.stringify({
        version: '2.0',
        language: 'English',
        adapters: { mode: 'explicit', enabled: ['ecmascript'] },
        rules: {},
      })}\n`,
    );
    writeProjectFile(
      'package.json',
      `${JSON.stringify({ name: 'fixture', type: 'module' })}\n`,
    );
    writeProjectFile(
      'src/over-cap.test.ts',
      Array.from(
        { length: 33 },
        (_, index) => `it('case ${index}', () => {});`,
      ).join('\n'),
    );
    writeProjectFile(
      'src/dynamic.spec.ts',
      "it.each(loadRows())('row', () => {});\n",
    );
    runReviewStateFixtureGit(projectRoot, ['add', '--all']);
    runReviewStateFixtureGit(projectRoot, [
      'commit',
      '-m',
      'add verification evidence',
    ]);

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.HANDOFF,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
      documentSync: 'no-change',
      repaired: 0,
    });
    const parsed = parseHandoffBlock(
      readFileSync(result.data.handoffPath, 'utf8'),
    );

    expect(parsed.handoff?.recorded).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          class: 'code-change',
          ruleId: 'test-record-case-cap',
          path: 'src/over-cap.test.ts',
          certainty: 'exact',
        }),
        expect.objectContaining({
          class: 'indeterminate',
          ruleId: 'spec-document-case-cap',
          path: 'src/dynamic.spec.ts',
          certainty: 'indeterminate',
        }),
      ]),
    );
  });

  it('keeps caller document-sync entries and fills their defaults', async () => {
    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.HANDOFF,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
      documentSync: 'declined',
      repaired: 0,
      entries: [
        {
          class: 'document-sync',
          ruleId: 'document-sync',
          path: '.',
          note: 'document-sync: approval declined',
        },
      ],
    });

    const parsed = parseHandoffBlock(
      readFileSync(result.data.handoffPath, 'utf8'),
    );
    expect(parsed.handoff?.recorded).toContainEqual({
      class: 'document-sync',
      ruleId: 'document-sync',
      path: '.',
      severity: 'warning',
      certainty: 'unstated',
      note: 'document-sync: approval declined',
    });
  });

  it('bounds oversized caller fields before recording a normal handoff', async () => {
    const ruleId = 'r'.repeat(100);
    const note = 'n'.repeat(300);
    const ancestorPath = 'a'.repeat(390);
    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.HANDOFF,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
      documentSync: 'committed',
      repaired: 0,
      entries: [
        {
          class: 'document-sync',
          ruleId,
          path: `${ancestorPath}/${'b'.repeat(20)}`,
          note,
        },
      ],
    });

    const parsed = parseHandoffBlock(
      readFileSync(result.data.handoffPath, 'utf8'),
    );
    expect(parsed.handoff?.recorded).toContainEqual({
      class: 'document-sync',
      ruleId: ruleId.slice(0, 80),
      path: ancestorPath,
      severity: 'warning',
      certainty: 'unstated',
      note: note.slice(0, 120),
    });
  });

  it('caps forty-one caller entries at forty recorded rows', async () => {
    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.HANDOFF,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
      documentSync: 'no-change',
      repaired: 0,
      entries: Array.from({ length: 41 }, (_, index) => ({
        class: 'document-sync' as const,
        ruleId: `caller-${String(index).padStart(2, '0')}`,
        path: '.',
        note: `caller entry ${index}`,
      })),
    });

    expect(result.summary.recorded).toBe(40);
    expect(result.summary.truncated).toBe(1);
    const parsed = parseHandoffBlock(
      readFileSync(result.data.handoffPath, 'utf8'),
    );
    expect(parsed.handoff?.recorded).toHaveLength(40);
    expect(parsed.handoff?.truncated).toBe(1);
  });

  it('retains caller entries before truncating machine candidates', () => {
    const callerEntries = Array.from({ length: 5 }, (_, index) => ({
      class: 'document-sync' as const,
      ruleId: `caller-${index}`,
      path: '.',
      note: `caller entry ${index}`,
    }));
    const { seed } = buildHandoffSeed({
      snapshotHash: 'snapshot-hash',
      scope: ['.'],
      documentSync: 'no-change',
      repaired: 0,
      findings: Array.from(
        { length: REVIEW_HANDOFF_MAX_ENTRIES },
        (_, index) => ({
          violation: {
            source: 'structure' as const,
            severity: 'warning' as const,
            path: `src/machine-${index}.ts`,
            ruleId: `machine-${index}`,
            message: `machine entry ${index}`,
            certainty: 'exact' as const,
          },
          class: 'code-change' as const,
          notePrefix: '',
        }),
      ),
      outOfScopeRoot: [],
      callerEntries,
    });

    expect(seed.recorded).toHaveLength(REVIEW_HANDOFF_MAX_ENTRIES);
    expect(seed.truncated).toBe(callerEntries.length);
    expect(
      seed.recorded.filter(({ ruleId }) => ruleId.startsWith('caller-')),
    ).toHaveLength(callerEntries.length);
  });

  it('counts all forty-five findings while recording only forty', async () => {
    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.HANDOFF,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
      documentSync: 'no-change',
      repaired: 0,
      entries: Array.from({ length: 45 }, (_, index) => ({
        class: 'code-change' as const,
        ruleId: `caller-${String(index).padStart(2, '0')}`,
        path: '.',
        note: `caller entry ${index}`,
      })),
    });

    const markdown = readFileSync(result.data.handoffPath, 'utf8');
    const totalCount = Object.values(result.data.counts).reduce(
      (total, count) => total + count,
      0,
    );
    expect(result.summary.recorded).toBe(40);
    expect(result.summary.truncated).toBe(5);
    expect(totalCount).toBe(45);
    expect(markdown).toContain('Counts: 45 code-change');
  });

  it('records one claim for a duplicated path, rule, and message', async () => {
    mockedComputeChangedScopeEvidence.mockImplementationOnce(async (input) => {
      const actual = await vi.importActual<
        typeof import('../../../mcp/tools/reviewState/scope/computeChangedScopeEvidence.js')
      >('../../../mcp/tools/reviewState/scope/computeChangedScopeEvidence.js');
      const computed = await actual.computeChangedScopeEvidence(input);
      const duplicate = {
        source: 'structure' as const,
        severity: 'warning' as const,
        path: 'src/value.ts',
        ruleId: 'circular-dependency',
        message: 'Cycle includes src/value.ts.',
        certainty: 'exact' as const,
      };
      return {
        ...computed,
        retained: [duplicate, { ...duplicate, severity: 'error' as const }],
        candidates: [
          {
            id: 'FCA-001',
            source: duplicate.source,
            scope: 'dag',
            category: 'structure',
            severity: 'error',
            path: duplicate.path,
            rule: duplicate.ruleId,
            message: duplicate.message,
            certainty: duplicate.certainty,
          },
        ],
      };
    });

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.HANDOFF,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
      documentSync: 'committed',
      repaired: 0,
    });
    const parsed = parseHandoffBlock(
      readFileSync(result.data.handoffPath, 'utf8'),
    );
    const duplicates = parsed.handoff?.recorded.filter(
      (entry) =>
        entry.path === 'src/value.ts' &&
        entry.ruleId === 'circular-dependency' &&
        entry.note === 'Cycle includes src/value.ts.',
    );
    expect(duplicates).toHaveLength(1);
    expect(duplicates?.[0].severity).toBe('error');
  });

  it('keeps a root finding when its message names a changed path', async () => {
    mockedComputeChangedScopeEvidence.mockImplementationOnce(async (input) => {
      const actual = await vi.importActual<
        typeof import('../../../mcp/tools/reviewState/scope/computeChangedScopeEvidence.js')
      >('../../../mcp/tools/reviewState/scope/computeChangedScopeEvidence.js');
      const computed = await actual.computeChangedScopeEvidence(input);
      return {
        ...computed,
        retained: [],
        candidates: [],
        outOfScope: [
          {
            source: 'structure' as const,
            severity: 'error' as const,
            path: '.',
            ruleId: 'circular-dependency',
            message: 'Cycle includes src/value.ts and another owner.',
            certainty: 'exact' as const,
          },
          {
            source: 'structure' as const,
            severity: 'error' as const,
            path: '.',
            ruleId: 'circular-dependency',
            message: 'Cycle includes src/value.tsx only.',
            certainty: 'exact' as const,
          },
        ],
      };
    });

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.HANDOFF,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
      documentSync: 'committed',
      repaired: 0,
    });
    const parsed = parseHandoffBlock(
      readFileSync(result.data.handoffPath, 'utf8'),
    );
    expect(parsed.handoff?.recorded).toContainEqual(
      expect.objectContaining({
        class: 'code-change',
        ruleId: 'circular-dependency',
        path: '.',
        note: 'Cycle includes src/value.ts and another owner.',
      }),
    );
    expect(parsed.handoff?.recorded).toContainEqual(
      expect.objectContaining({
        class: 'indeterminate',
        ruleId: 'circular-dependency',
        path: '.',
        note: 'scope-uncertain: Cycle includes src/value.tsx only.',
      }),
    );
  });

  it('records scan-level diagnostics as indeterminate claims', async () => {
    mockedComputeChangedScopeEvidence.mockImplementationOnce(async (input) => {
      const actual = await vi.importActual<
        typeof import('../../../mcp/tools/reviewState/scope/computeChangedScopeEvidence.js')
      >('../../../mcp/tools/reviewState/scope/computeChangedScopeEvidence.js');
      const computed = await actual.computeChangedScopeEvidence(input);
      return {
        ...computed,
        retained: [],
        candidates: [],
        outOfScope: [],
        evidenceDiagnostics: [
          {
            code: 'adapter-unsupported',
            message: 'Adapter evidence is unavailable.',
            path: 'src/value.ts',
          },
        ],
      };
    });

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.HANDOFF,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
      documentSync: 'committed',
      repaired: 0,
    });
    const parsed = parseHandoffBlock(
      readFileSync(result.data.handoffPath, 'utf8'),
    );
    expect(result.diagnostics).toContainEqual({
      code: 'adapter-unsupported',
      message: 'Adapter evidence is unavailable.',
      path: 'src/value.ts',
    });
    expect(parsed.handoff?.recorded).toContainEqual({
      class: 'indeterminate',
      ruleId: 'adapter-unsupported',
      path: 'src/value.ts',
      severity: 'warning',
      certainty: 'unstated',
      note: 'adapter-unsupported: Adapter evidence is unavailable.',
    });
  });

  it('renders an unresolved base as a failed validation handoff', async () => {
    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.HANDOFF,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'refs/heads/missing',
      documentSync: 'committed',
      repaired: 1,
      entries: [
        {
          class: 'document-sync',
          ruleId: 'z-caller',
          path: 'z',
          note: 'caller document decision',
        },
        {
          class: 'code-change',
          ruleId: 'a-caller',
          path: 'a',
          note: 'caller code change',
        },
      ],
    });

    const parsed = parseHandoffBlock(
      readFileSync(result.data.handoffPath, 'utf8'),
    );
    expect(result.summary).toMatchObject({
      snapshotHash: null,
      documentSync: 'failed',
    });
    expect(parsed.handoff?.recorded).toContainEqual(
      expect.objectContaining({
        class: 'document-sync',
        ruleId: 'handoff-validate',
        path: '.',
        severity: 'warning',
        certainty: 'unstated',
      }),
    );
    expect(
      parsed.handoff?.recorded.find(
        (entry) => entry.ruleId === 'handoff-validate',
      )?.note,
    ).toBe('Review base ref could not be resolved: refs/heads/missing');
    expect(parsed.handoff?.recorded.map((entry) => entry.ruleId)).toEqual([
      'z-caller',
      'a-caller',
      'handoff-validate',
    ]);
    expect(parsed.handoff?.truncated).toBe(0);
  });

  it('bounds oversized caller fields in a failed-base handoff', async () => {
    const ruleId = 'r'.repeat(100);
    const note = 'n'.repeat(300);
    const ancestorPath = 'a'.repeat(390);
    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.HANDOFF,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'refs/heads/missing',
      documentSync: 'committed',
      repaired: 0,
      entries: [
        {
          class: 'document-sync',
          ruleId,
          path: `${ancestorPath}/${'b'.repeat(20)}`,
          note,
        },
      ],
    });

    const parsed = parseHandoffBlock(
      readFileSync(result.data.handoffPath, 'utf8'),
    );
    expect(parsed.handoff?.recorded).toContainEqual({
      class: 'document-sync',
      ruleId: ruleId.slice(0, 80),
      path: ancestorPath,
      severity: 'warning',
      certainty: 'unstated',
      note: note.slice(0, 120),
    });
  });

  it('keeps the validation entry when caller entries already fill the bound', async () => {
    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.HANDOFF,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'refs/heads/missing',
      documentSync: 'committed',
      repaired: 0,
      entries: Array.from({ length: 40 }, (_, index) => ({
        class: 'document-sync' as const,
        ruleId: `caller-${index}`,
        path: '.',
        note: `caller entry ${index}`,
      })),
    });

    const parsed = parseHandoffBlock(
      readFileSync(result.data.handoffPath, 'utf8'),
    );
    expect(parsed.handoff?.recorded).toHaveLength(40);
    expect(parsed.handoff?.recorded.at(-1)?.ruleId).toBe('handoff-validate');
    expect(parsed.handoff?.truncated).toBe(1);
    expect(result.summary.truncated).toBe(1);
    expect(result.data.counts['document-sync']).toBe(41);
  });

  it('includes the first parser diagnostic in a self-check failure', async () => {
    mockedParseHandoffBlock.mockReturnValueOnce({
      handoff: null,
      remainder: '',
      diagnostics: [
        { code: 'handoff-invalid', message: 'Schema mismatch at recorded.' },
      ],
    });

    await expect(
      handleReviewState({
        action: REVIEW_STATE_ACTIONS.HANDOFF,
        projectRoot,
        branchName: BRANCH,
        baseRef: 'main',
        documentSync: 'committed',
        repaired: 0,
      }),
    ).rejects.toThrow(
      'handoff self-check failed: handoff-invalid: Schema mismatch at recorded.',
    );
  });

  it('renders None and an empty machine array when no finding remains', async () => {
    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.HANDOFF,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
      documentSync: 'no-change',
      repaired: 0,
    });

    const markdown = readFileSync(result.data.handoffPath, 'utf8');
    expect(markdown).toContain('## FCA Handoff\n\nNone\n\n');
    expect(markdown).toContain('"recorded":[]');
  });

  it('does not create evidence or state artifacts', async () => {
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.HANDOFF,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
      documentSync: 'committed',
      repaired: 0,
    });

    const paths = resolveReviewStatePaths(projectRoot, BRANCH);
    expect(existsSync(paths.evidencePath)).toBe(false);
    expect(existsSync(paths.statePath)).toBe(false);
  });
});

describe('foldHandoffScope', () => {
  it('folds the deepest owner paths until the scope reaches its limit', () => {
    expect(
      foldHandoffScope(['a/one/deep', 'a/two/deep', 'b/deep', 'a/one/deep'], 2),
    ).toEqual(['a', 'b/deep']);
  });

  it('collapses six entries sharing one class and rule into one table row', () => {
    const markdown = renderHandoffMarkdown(
      buildSeed({
        recorded: Array.from({ length: 6 }, (_, index) => ({
          class: 'code-change',
          ruleId: 'same-rule',
          path: `src/group/file-${index}.ts`,
          severity: 'warning',
          certainty: 'exact',
          note: `finding ${index}`,
        })),
      }),
      { ...EMPTY_HANDOFF_COUNTS, 'code-change': 6 },
    );

    expect(markdown).toContain(
      '| code-change | same-rule | src/group | exact | 6 findings |',
    );
    expect(markdown.match(/\| code-change \| same-rule \|/g)).toHaveLength(1);
  });

  it('stops a collapsed common path at the first differing segment', () => {
    const markdown = renderHandoffMarkdown(
      buildSeed({
        recorded: Array.from({ length: 6 }, (_, index) => ({
          class: 'code-change',
          ruleId: 'same-rule',
          path: `src/${index % 2 === 0 ? 'alpha' : 'beta'}/index.ts`,
          severity: 'warning',
          certainty: 'exact',
          note: `finding ${index}`,
        })),
      }),
      { ...EMPTY_HANDOFF_COUNTS, 'code-change': 6 },
    );

    expect(markdown).toContain(
      '| code-change | same-rule | src | exact | 6 findings |',
    );
    expect(markdown).not.toContain('src/index.ts');
  });

  it('reports table rows omitted beyond the twenty-row display cap', () => {
    const markdown = renderHandoffMarkdown(
      buildSeed({
        recorded: Array.from({ length: 21 }, (_, index) => ({
          class: 'code-change',
          ruleId: `rule-${String(index).padStart(2, '0')}`,
          path: `src/file-${index}.ts`,
          severity: 'warning',
          certainty: 'exact',
          note: `finding ${index}`,
        })),
      }),
      { ...EMPTY_HANDOFF_COUNTS, 'code-change': 21 },
    );

    expect(markdown).toContain('… and 1 more (see machine block)');
  });

  it('escapes HTML table cells and angle brackets in the machine JSON', () => {
    const markdown = renderHandoffMarkdown(
      buildSeed({
        recorded: [
          {
            class: 'indeterminate',
            ruleId: 'test-record-case-cap',
            path: 'src/<generated>&value.ts',
            severity: 'warning',
            certainty: 'indeterminate',
            note: 'count < 1 and > 0',
          },
        ],
      }),
      { ...EMPTY_HANDOFF_COUNTS, indeterminate: 1 },
    );

    expect(markdown).toContain('src/&lt;generated&gt;&amp;value.ts');
    expect(markdown).toContain('count &lt; 1 and &gt; 0');
    expect(markdown).toContain('"note":"count \\u003c 1 and \\u003e 0"');
    expect(parseHandoffBlock(markdown).diagnostics).toEqual([]);
  });
});
