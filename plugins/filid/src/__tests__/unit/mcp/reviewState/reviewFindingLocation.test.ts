import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { buildVerdictReviewFinding } from './helpers/buildVerdictReviewFinding.js';
import { buildVerifyOpinion } from './helpers/buildVerifyOpinion.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import { createReviewStateSealFixture } from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';

/** Disposable committed source and isolated reviewer methods for each location case. */
let fixture: ReturnType<typeof createReviewStateSealFixture>;
beforeEach(() => {
  fixture = createReviewStateSealFixture();
  configureReviewGroups(fixture.projectRoot, 1);
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

describe('review finding location uncertainty', () => {
  it.each([
    { kind: 'ambiguous', excerpt: 'return 2;', lines: 'unknown' },
    { kind: 'unmatched', excerpt: 'return missing;', lines: 'unknown' },
    { kind: 'deleted', excerpt: 'export const value = 1;', lines: 'unknown' },
    {
      kind: 'unique',
      excerpt: 'export function first(input: number) {',
      lines: '1-1',
    },
  ])(
    'requires an independent decision for $kind evidence',
    async ({ kind, excerpt, lines }) => {
      if (kind === 'deleted')
        execFileSync('git', ['rm', 'src/value.ts'], {
          cwd: fixture.projectRoot,
        });
      else
        writeFileSync(
          join(fixture.projectRoot, 'src/value.ts'),
          [
            'export function first(input: number) {',
            '  return 2;',
            '}',
            'export function second(input: number) {',
            '  return 2;',
            '}',
            '',
          ].join('\n'),
        );
      execFileSync(
        'git',
        ['commit', '-am', 'Prepare location evidence', '-q'],
        {
          cwd: fixture.projectRoot,
        },
      );
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'low',
      });
      const state = readPreparedReviewState(prepared);
      const group = state.groups[0]!;
      const finding = buildVerdictReviewFinding({
        id: `R${group.id}-001`,
        path: 'src/value.ts',
        existingCode: excerpt,
        message: 'The changed behavior breaks a caller contract.',
        evidence: 'Compare the assigned diff with the caller expectation.',
      });
      writeFileSync(
        prepared.data.next[0]!.outputPath,
        JSON.stringify({
          ...buildReviewOpinion(state, group),
          findings: [finding],
        }),
      );
      const reviewed = await handleReviewState({
        action: 'validate',
        projectRoot: fixture.projectRoot,
        kind: 'review',
        group: group.id,
        round: 1,
      });
      expect(reviewed.summary.ok).toBe(true);
      expect(reviewed.data).toHaveProperty('verifierRequired', true);
      const merged = JSON.parse(
        readFileSync(
          join(prepared.data.reviewDirectory, group.opinionPath),
          'utf8',
        ),
      );
      expect(merged.findings[0]).toMatchObject({
        lines,
        existingCode: excerpt,
      });
      expect(
        readFileSync(
          join(prepared.data.reviewDirectory, group.verifyBriefPath),
          'utf8',
        ),
      ).toContain(finding.id);
      const verdict = kind === 'unmatched' ? 'INDETERMINATE' : 'CONFIRMED';
      writeFileSync(
        join(prepared.data.reviewDirectory, group.verifyPath),
        JSON.stringify(
          buildVerifyOpinion(state, group.id, [
            {
              findingId: finding.id,
              verdict,
              evidence:
                'The independent inspection reached a decision on the assigned diff.',
              reason: 'Location uncertainty alone does not disprove the claim.',
            },
          ]),
        ),
      );
      const verified = await handleReviewState({
        action: 'validate',
        projectRoot: fixture.projectRoot,
        kind: 'verify',
        group: group.id,
      });
      expect(verified.summary.ok).toBe(true);
      const sealed = await handleReviewState({
        action: 'seal',
        projectRoot: fixture.projectRoot,
      });
      expect(sealed.summary).toHaveProperty(
        'confirmed',
        kind === 'unmatched' ? 0 : 1,
      );
      // Deleting the fixture's only source leaves structure evidence indeterminate.
      if (kind === 'deleted') expect(state.scope.evidenceComplete).toBe(false);
      expect(sealed.summary.verdict).toBe(
        kind === 'unmatched' || kind === 'deleted'
          ? 'INCONCLUSIVE'
          : 'REQUEST_CHANGES',
      );
    },
  );
});
