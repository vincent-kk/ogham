import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import type { ReviewStateRecord } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { buildVerdictReviewFinding } from './helpers/buildVerdictReviewFinding.js';
import { buildVerifyOpinion } from './helpers/buildVerifyOpinion.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';

/** Real committed histories isolate file selection from provider behavior. */
let fixture: ReviewStateSealFixture;
beforeEach(() => {
  fixture = createReviewStateSealFixture();
  configureReviewGroups(fixture.projectRoot, 3, { groupFileLimit: 32 });
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

/** Run the public API with ordinary file-writing reviewer handoffs. */
async function complete(
  request: { changeContext?: string; userInstructions?: string } = {},
) {
  const prepared = await handleReviewState({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    effort: 'low',
    ...request,
  });
  expect(prepared.summary.generationId).toBeDefined();
  const state: ReviewStateRecord = JSON.parse(
    readFileSync(prepared.data.statePath, 'utf8'),
  );
  for (const next of prepared.data.next) {
    const group = state.groups.find((entry) => entry.id === next.group)!;
    writeFileSync(
      next.outputPath,
      JSON.stringify(buildReviewOpinion(state, group, 1)),
    );
    const result = await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'review',
      group: next.group,
      round: 1,
    });
    expect(result.summary.ok).toBe(true);
  }
  const sealed = await handleReviewState({
    action: 'seal',
    projectRoot: fixture.projectRoot,
  });
  expect(sealed.summary.disposition).toBe('sealed');
  return { ...prepared, data: { ...prepared.data, state } };
}

describe('committed file incremental review', () => {
  it('rechecks only the file named by changed handoff evidence, ignoring snapshot metadata', async () => {
    const seed = {
      schema: 1,
      snapshotHash: 'first-snapshot',
      scope: ['src/value1.ts'],
      documentSync: 'committed',
      repaired: 0,
      recorded: [
        {
          class: 'needs-rework',
          ruleId: 'boundary',
          path: 'src/value1.ts',
          severity: 'warning',
          certainty: 'exact',
          note: 'Check the value.',
        },
      ],
      truncated: 0,
    };
    const original = {
      changeContext: `Summary\n<!-- filid:handoff v1\n${JSON.stringify(seed)}\n-->`,
    };
    await complete(original);
    const metadata = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      changeContext: original.changeContext.replace(
        'first-snapshot',
        'second-snapshot',
      ),
    });
    expect(metadata.data.next).toEqual([]);
    const changed = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      changeContext: original.changeContext.replace(
        'Check the value.',
        'Check the error boundary.',
      ),
    });
    expect(
      changed.data.groups
        .filter((group) => !group.reusedFrom)
        .flatMap((group) => group.units.map((unit) => unit.path)),
    ).toEqual(['src/value1.ts']);
  });

  it('rechecks actual consumers of a changed rule while preserving other file results', async () => {
    writeFileSync(
      join(fixture.pluginRoot, 'skills/cross-review/rules/rules.json'),
      JSON.stringify({
        schema_version: 1,
        rules: [
          { id: 'default', always: true, file: 'default.md' },
          { id: 'local', match: ['src/value1.ts'], file: 'local.md' },
        ],
      }),
    );
    writeFileSync(
      join(fixture.pluginRoot, 'skills/cross-review/rules/local.md'),
      '# Local criterion\nInspect the exported value.\n',
    );
    await complete();
    writeFileSync(
      join(fixture.pluginRoot, 'skills/cross-review/rules/local.md'),
      '# Local criterion\nInspect the exported value and error behavior.\n',
    );
    const changed = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(
      changed.data.groups
        .filter((group) => !group.reusedFrom)
        .flatMap((group) => group.units.map((unit) => unit.path)),
    ).toEqual(['src/value1.ts']);
  });

  it.each(['confirmed', 'pending', 'excluded'])(
    'requires explicit resolution of an earlier %s finding after its file changes',
    async (priorStatus) => {
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'low',
      });
      const state: ReviewStateRecord = JSON.parse(
        readFileSync(prepared.data.statePath, 'utf8'),
      );
      const group = state.groups[0];
      const finding = buildVerdictReviewFinding({
        path: 'src/value1.ts',
        existingCode: 'export const value1 = 1;',
        id: 'R01-001',
      });
      writeFileSync(
        prepared.data.next[0].outputPath,
        JSON.stringify({
          ...buildReviewOpinion(state, group),
          findings: [finding],
        }),
      );
      const reviewed = await handleReviewState({
        action: 'validate',
        projectRoot: fixture.projectRoot,
        group: group.id,
        kind: 'review',
        round: 1,
      });
      expect(reviewed.summary.ok).toBe(true);
      writeFileSync(
        join(prepared.data.reviewDirectory, group.verifyPath),
        JSON.stringify(
          buildVerifyOpinion(state, group.id, [
            {
              findingId: finding.id,
              verdict: 'CONFIRMED',
              evidence: 'Committed value is 1.',
              reason: 'The checked value is still incorrect.',
            },
          ]),
        ),
      );
      if (priorStatus !== 'pending') {
        await handleReviewState({
          action: 'validate',
          projectRoot: fixture.projectRoot,
          group: group.id,
          kind: 'verify',
        });
        await handleReviewState({
          action: 'seal',
          projectRoot: fixture.projectRoot,
        });
      }
      writeFileSync(
        join(fixture.projectRoot, 'src/value1.ts'),
        'export const value1 = 42;\n',
      );
      execFileSync('git', ['commit', '-am', 'Fix reviewed value', '-q'], {
        cwd: fixture.projectRoot,
      });
      if (priorStatus === 'excluded') {
        const configPath = join(fixture.projectRoot, '.filid/config.json');
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        config.structure = { generatedPaths: ['src/value1.ts'] };
        writeFileSync(configPath, JSON.stringify(config));
      }
      const next = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
      });
      const updated: ReviewStateRecord = JSON.parse(
        readFileSync(next.data.statePath, 'utf8'),
      );
      const fresh = updated.groups.find((entry) => !entry.reusedFrom)!;
      expect(
        updated.groups.flatMap((entry) => entry.priorFindings ?? []),
      ).toContainEqual(expect.objectContaining({ id: finding.id }));
      expect(readFileSync(next.data.next[0].briefPath, 'utf8')).toContain(
        finding.id,
      );
      writeFileSync(
        next.data.next[0].outputPath,
        JSON.stringify(buildReviewOpinion(updated, fresh)),
      );
      const corrected = await handleReviewState({
        action: 'validate',
        projectRoot: fixture.projectRoot,
        group: fresh.id,
        kind: 'review',
        round: 1,
      });
      expect(corrected.data).toMatchObject({ verifierRequired: true });
      expect(corrected.data.next).toContainEqual(
        expect.objectContaining({ kind: 'verify', group: fresh.id }),
      );
      writeFileSync(
        join(next.data.reviewDirectory, fresh.verifyPath),
        JSON.stringify(buildVerifyOpinion(updated, fresh.id, [])),
      );
      const omitted = await handleReviewState({
        action: 'validate',
        projectRoot: fixture.projectRoot,
        group: fresh.id,
        kind: 'verify',
      });
      expect(omitted.summary.ok).toBe(false);
      writeFileSync(
        join(next.data.reviewDirectory, fresh.verifyPath),
        JSON.stringify(
          buildVerifyOpinion(updated, fresh.id, [
            {
              findingId: finding.id,
              verdict: 'REFUTED',
              evidence: 'Committed value is now 42.',
              reason: 'The previous incorrect value has been replaced.',
            },
          ]),
        ),
      );
      const verified = await handleReviewState({
        action: 'validate',
        projectRoot: fixture.projectRoot,
        group: fresh.id,
        kind: 'verify',
      });
      expect(verified.summary.ok).toBe(true);
      const sealed = await handleReviewState({
        action: 'seal',
        projectRoot: fixture.projectRoot,
      });
      expect(sealed.summary.verdict).toBe('APPROVED');
    },
  );

  it('preserves a content-identical rename and reviews a later edit at its new path', async () => {
    await complete();
    execFileSync('git', ['mv', 'src/value1.ts', 'src/renamed.ts'], {
      cwd: fixture.projectRoot,
    });
    execFileSync('git', ['commit', '-qm', 'Move reviewed file'], {
      cwd: fixture.projectRoot,
    });
    const renamed = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(renamed.data.next).toEqual([]);
    expect(
      renamed.data.groups.flatMap((group) =>
        group.units.map((unit) => unit.path),
      ),
    ).toContain('src/renamed.ts');
    await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    writeFileSync(
      join(fixture.projectRoot, 'src/renamed.ts'),
      'export const value1 = 99;\n',
    );
    execFileSync('git', ['commit', '-am', 'Edit moved file', '-q'], {
      cwd: fixture.projectRoot,
    });
    const changed = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(
      changed.data.groups
        .filter((group) => !group.reusedFrom)
        .flatMap((group) => group.units.map((unit) => unit.path)),
    ).toEqual(['src/renamed.ts']);
  });

  it('reviews deletion of a previously added file without forgetting its peers', async () => {
    await complete();
    execFileSync('git', ['rm', 'src/value1.ts'], { cwd: fixture.projectRoot });
    execFileSync('git', ['commit', '-qm', 'Delete reviewed addition'], {
      cwd: fixture.projectRoot,
    });
    const deleted = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(
      deleted.data.groups
        .filter((group) => !group.reusedFrom)
        .flatMap((group) =>
          group.units.map((unit) => [unit.path, unit.change]),
        ),
    ).toEqual([['src/value1.ts', 'D']]);
    expect(
      deleted.data.files.find((file) => file.path === 'src/value1.ts')
        ?.skipReason,
    ).toBeNull();
    await complete();
    const cached = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(cached.data.next).toEqual([]);
  });

  it('does not select uncommitted edits or untracked files for another review', async () => {
    await complete();
    writeFileSync(
      join(fixture.projectRoot, 'src/value1.ts'),
      'export const value1 = 99;\n',
    );
    writeFileSync(
      join(fixture.projectRoot, 'src/local.ts'),
      'export const local = true;\n',
    );
    const current = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(current.data.next).toEqual([]);
    expect(current.data.files.map((file) => file.path)).not.toContain(
      'src/local.ts',
    );
  });

  it('reviews one changed file while preserving its two unchanged group peers', async () => {
    const first = await complete();
    expect(first.data.state!.groups).toHaveLength(1);
    const original = readFileSync(
      join(first.data.reviewDirectory, first.data.state!.groups[0].opinionPath),
      'utf8',
    );
    writeFileSync(
      join(fixture.projectRoot, 'src/value1.ts'),
      'export const value1 = 42;\n',
    );
    execFileSync('git', ['add', 'src/value1.ts'], { cwd: fixture.projectRoot });
    execFileSync('git', ['commit', '-qm', 'Change one reviewed file'], {
      cwd: fixture.projectRoot,
    });
    const next = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    const nextState: ReviewStateRecord = JSON.parse(
      readFileSync(next.data.statePath, 'utf8'),
    );
    const pending = new Set(next.data.next.map((handoff) => handoff.group));
    expect(
      nextState.groups
        .filter((group) => pending.has(group.id))
        .flatMap((group) => group.units.map((unit) => unit.path)),
    ).toEqual(['src/value1.ts']);
    expect(
      nextState.groups
        .filter((group) => group.reusedFrom)
        .flatMap((group) => group.units.map((unit) => unit.path)),
    ).toEqual(['src/value.ts', 'src/value2.ts']);
    expect(
      readFileSync(
        join(
          first.data.reviewDirectory,
          first.data.state!.groups[0].opinionPath,
        ),
        'utf8',
      ),
    ).toBe(original);
    await complete();
    const cached = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(cached.summary.disposition).toBe('cached');
    expect(cached.data.next).toEqual([]);
  });

  it('preserves explicit instructions and the latest committed delta after brief recovery', async () => {
    const request = {
      userInstructions: 'USR-001: Inspect the exported value.',
    };
    await complete(request);
    writeFileSync(
      join(fixture.projectRoot, 'src/value1.ts'),
      'export const value1 = 42;\n',
    );
    execFileSync('git', ['commit', '-qam', 'Change one value'], {
      cwd: fixture.projectRoot,
    });
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      ...request,
    });
    rmSync(prepared.data.next[0].briefPath);
    const repaired = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      ...request,
    });
    const brief = readFileSync(repaired.data.next[0].briefPath, 'utf8');
    expect(brief).toContain(request.userInstructions);
    expect(brief).toContain('Changes Since Previous Review');
    expect(brief).toContain('+export const value1 = 42;');
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      ...request,
    });
    expect(readFileSync(repaired.data.next[0].briefPath, 'utf8')).toBe(brief);
  });

  it('budgets only the one changed file while retaining 51 previous file opinions', async () => {
    configureReviewGroups(fixture.projectRoot, 52);
    await complete();
    const configPath = join(fixture.projectRoot, '.filid/config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    config.review.maxGroups = 1;
    writeFileSync(configPath, JSON.stringify(config));
    writeFileSync(
      join(fixture.projectRoot, 'src/value1.ts'),
      'export const value1 = 42;\n',
    );
    execFileSync('git', ['commit', '-qam', 'Change one of 52 files'], {
      cwd: fixture.projectRoot,
    });
    const next = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(next.data.next).toHaveLength(1);
    expect(next.summary).toMatchObject({
      reusedGroups: 51,
      reusedFiles: 51,
      reviewFiles: 1,
      rerunGroups: 1,
      remainingMaxReviewerHandoffs: 1,
    });
  });
});
