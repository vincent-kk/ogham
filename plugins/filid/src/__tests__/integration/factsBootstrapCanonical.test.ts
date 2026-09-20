import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const canonical = readFileSync(
  join(packageRoot, 'skills/.shared/facts-bootstrap.md'),
  'utf8',
);

/** Heading of the one section whose wording decides what a failed bootstrap does. */
const FAILURE_HEADING = '## If the bootstrap cannot finish';

/** Sentences that hand a step to a person instead of naming the agent's next action. */
const HUMAN_CALL =
  /AskUserQuestion|\[INTERACTIVE\]|\b(?:ask|tell|notify|consult|escalate to)\b[^.\n]*\b(?:user|human|owner|maintainer|operator)s?\b|\b(?:user|human)(?:'s)? (?:decision|approval|confirmation|input)\b/i;

/**
 * Cut one numbered step out of the canonical document.
 * @param step Step number, 1 through 8.
 * @returns The text from that step's heading up to the next heading of the same or higher level.
 */
function stepText(step: number): string {
  const start = canonical.indexOf(`\n### ${step}. `);
  const rest = canonical.slice(start + 1);
  const end = rest.slice(1).search(/\n#{2,3} /);
  return end === -1 ? rest : rest.slice(0, end + 1);
}

describe('the canonical bootstrap walks the seven branches in order', () => {
  it.each([
    [
      1,
      [
        'action: "status"',
        'projectState',
        'resolutionEpoch',
        'scopeSource',
        'extractionList',
        'facts-uninitialized',
      ],
    ],
    [
      2,
      [
        'extractionList.path',
        'extractionList.unrepresentable',
        'node "${CLAUDE_PLUGIN_ROOT}/bridge/filid-facts.mjs" --root',
        '--files-from EXTRACTION_LIST_PATH',
        'mktemp "${TMPDIR:-/tmp}/filid-facts.XXXXXX"',
        '--out "$FACTS_OUT"',
        'action: "submit"',
        'resolutionEpoch',
      ],
    ],
    [
      3,
      [
        'facts-epoch-moved',
        'facts-tree-unstable',
        'facts.excludes',
        'facts-file-too-large',
        'mktemp "${TMPDIR:-/tmp}/filid-facts.XXXXXX"',
        'facts-record-changed',
        'facts-side-table-changed',
      ],
    ],
    [
      4,
      [
        'data.rejected.items',
        'facts-content-hash-mismatch',
        'facts-resolution-input-unreadable',
        'facts-source-file-unreadable',
        'nextAction',
        'toolError',
      ],
    ],
    [
      5,
      [
        'data.unadjudicated.items',
        'action: "adjudicate"',
        'sourcePath',
        'facts-adjudication-actor-required',
        'facts-adjudication-reason-required',
        'facts-adjudication-stale-content',
        '`adopt`',
        '`dismiss`',
      ],
    ],
    [
      6,
      [
        'attestationRequirement',
        'data.pendingAttestations',
        'actor',
        'discard-pending',
        'nonReferences',
      ],
    ],
    [
      7,
      [
        'facts-judgements-unreadable',
        'action: "discard-damaged"',
        'shards',
        'facts-shard-not-damaged',
        'data.discarded',
        'compare',
      ],
    ],
    [8, ['exact', 'tool-error']],
  ] as const)('step %i names its calls and next actions', (step, tokens) => {
    const text = stepText(step);
    for (const token of tokens) expect(text).toContain(token);
    expect(canonical.indexOf(`\n### ${step}. `)).toBeLessThan(
      canonical.indexOf(step === 8 ? FAILURE_HEADING : `\n### ${step + 1}. `),
    );
  });
});

describe('the canonical bootstrap bounds what the agent does', () => {
  it('writes extraction output outside the project tree and names no server-chosen directory', () => {
    const text = stepText(2);
    expect(text).toMatch(/outside the project tree/i);
    expect(text).toMatch(/refuse[^.\n]*epoch/i);
    expect(canonical).not.toContain('recommendedOutputDir');
    expect(canonical).not.toMatch(/habitual/i);
  });

  it('names every output file uniquely instead of fixing a name', () => {
    expect(canonical).not.toMatch(/\/[\w.-]+\.json\b(?<!config\.json)/);
    const outs = [...canonical.matchAll(/--out (\S+)/g)].map(([, out]) => out);
    expect(outs.length).toBeGreaterThan(0);
    for (const out of outs) expect(out).toMatch(/^"\$[A-Z_]+"$/);
  });

  it('limits Bash to the extractor and keeps its output out of context', () => {
    expect(canonical).toMatch(/only Bash call[^.\n]*extractor/i);
    expect(canonical).toMatch(/never print or read the output file/i);
    expect(canonical).toMatch(/never run git/i);
    expect(canonical).toMatch(/with the Read tool/i);
  });

  it('hands every dismiss confirmation to a separate subagent that did not raise the item', () => {
    const text = stepText(5);
    expect(text).toMatch(/`dismiss`[^\n]*separate subagent/);
    expect(text).toMatch(/cannot confirm/i);
    expect(text).toMatch(/`adopt`[^\n]*one actor/i);
  });

  it('never repeats a call with the same input', () => {
    expect(stepText(8)).toMatch(
      /never repeat the same call with the same input/i,
    );
  });

  it('calls no person in any branch', () => {
    const hits = canonical
      .split(/(?<=[.!?])\s+|\n/)
      .filter((sentence) => HUMAN_CALL.test(sentence));
    expect(hits).toEqual([]);
  });

  it('decides the failure effect in one section alone, per calling skill', () => {
    const failure = canonical.slice(canonical.indexOf(FAILURE_HEADING));
    expect(canonical.split(FAILURE_HEADING)).toHaveLength(2);
    expect(failure).toMatch(/indeterminate/i);
    for (const skill of [
      'scan',
      'guide',
      'restructure',
      'cross-review',
      'pull-request',
      'revalidate',
    ])
      expect(failure).toContain(`\`${skill}\``);
    expect(failure).toMatch(/facts-incomplete/);
    expect(failure).toMatch(/identical to one already made/i);
    expect(canonical.match(/advisory/gi)).toBeNull();
  });
});
