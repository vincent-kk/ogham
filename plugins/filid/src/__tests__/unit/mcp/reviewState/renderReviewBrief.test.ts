import { describe, expect, it } from 'vitest';

import { REVIEW_BRIEF_INLINE_DIFF_LIMIT } from '../../../../constants/reviewState.js';
import { renderReviewBrief } from '../../../../mcp/tools/reviewState/brief/renderReviewBrief.js';
import { checkReviewOpinion } from '../../../../mcp/tools/reviewState/opinion/checkReviewOpinion.js';
import { parseReviewOpinion } from '../../../../mcp/tools/reviewState/opinion/parseReviewOpinion.js';
import { parseHandoffBlock } from '../../../../mcp/tools/reviewState/scope/parseHandoffBlock.js';
import { REVIEW_HANDOFF_SEED_SCHEMA } from '../../../../mcp/tools/reviewState/scope/reviewHandoffSeedSchema.js';
import type { ReviewValidationProblem } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildReviewBriefInput } from './helpers/buildReviewBriefInput.js';

/** Output-contract JSON fence captured from a rendered brief. */
const OUTPUT_CONTRACT_PATTERN =
  /## Output Contract\n\n```json\n([\s\S]*?)\n```/;

describe('renderReviewBrief', () => {
  it('renders FCA Handoff between Change Context and Files', () => {
    const input = buildReviewBriefInput();
    const entry = {
      class: 'code-change',
      ruleId: 'exact-path',
      path: 'src/a.ts',
      severity: 'warning',
      certainty: 'exact',
      note: 'Inspect | tree\nbefore raising.',
    };
    const outside = { ...entry, ruleId: 'outside-prefix', path: 'src/a.tsx' };
    input.handoff = REVIEW_HANDOFF_SEED_SCHEMA.parse({
      schema: 1,
      snapshotHash: 'snapshot-hash',
      scope: ['.'],
      documentSync: 'committed',
      repaired: 2,
      recorded: [
        entry,
        { ...entry },
        {
          ...entry,
          class: 'config-decision',
          ruleId: 'ancestor-path',
          path: 'src',
        },
        {
          ...entry,
          class: 'indeterminate',
          ruleId: 'descendant-path',
          path: 'src/b.ts/child',
        },
        { ...entry, class: 'needs-rework', ruleId: 'root-path', path: '.' },
        {
          ...entry,
          class: 'document-sync',
          ruleId: 'sync-outside',
          path: 'docs/DETAIL.md',
        },
        {
          ...entry,
          class: 'unresolved-path',
          ruleId: 'unresolved-outside',
          path: 'missing/path',
        },
        outside,
        { ...outside },
        { ...entry, ruleId: 'outside-ancestor-prefix', path: 'src/a' },
      ],
      truncated: 3,
    });
    const output = renderReviewBrief(input);
    expect(output.indexOf('## FCA Handoff')).toBeGreaterThan(
      output.indexOf('## Change Context'),
    );
    expect(output.indexOf('## FCA Handoff')).toBeLessThan(
      output.indexOf('## Files'),
    );
    const section = output
      .split('## FCA Handoff\n')[1]!
      .split('\n## Files')[0]!;
    expect(section).toContain(
      'snapshot `snapshot-hash`, document sync `committed`, 2 repaired, 3 not carried',
    );
    expect(section).toContain('a row is never a finding by itself.');
    expect(section).toContain('| Class | Rule | Path | Certainty | Note |');
    expect(section).toContain(
      '| code-change | exact-path | src/a.ts | exact | Inspect \\| tree before raising. |',
    );
    for (const rule of [
      'ancestor-path',
      'descendant-path',
      'root-path',
      'sync-outside',
      'unresolved-outside',
    ])
      expect(section).toContain(`| ${rule} |`);
    expect(
      section.split('\n').filter((line) => line.startsWith('|')),
    ).toHaveLength(8);
    expect(section).toContain(
      "2 more rows name paths outside this group's files.",
    );
    expect(section).not.toContain('outside-prefix');
    expect(section).not.toContain('outside-ancestor-prefix');
    input.handoff.snapshotHash = null;
    expect(renderReviewBrief(input)).toContain('snapshot `unknown`');
  });

  it.each([
    {
      name: 'contains snapshot backticks and LF within the handoff summary',
      snapshotHash: 'hash`\n## Synthetic snapshot heading\n`tail',
      sanitizedHash: 'hash ## Synthetic snapshot heading tail',
      ruleId: 'exact-path',
      path: 'src/a.ts',
      note: 'Inspect the tree.',
      expectedRow:
        '| document-sync | exact-path | src/a.ts | exact | Inspect the tree. |',
    },
    {
      name: 'contains lone CR note headings within one handoff table row',
      snapshotHash: 'snapshot-hash',
      sanitizedHash: 'snapshot-hash',
      ruleId: 'exact-path',
      path: 'src/a.ts',
      note: 'before\r## Synthetic note heading\rafter',
      expectedRow:
        '| document-sync | exact-path | src/a.ts | exact | before ## Synthetic note heading after |',
    },
    {
      name: 'normalizes decoded handoff newline runs, tabs, and Cc controls for display',
      snapshotHash: 'hash\r\n\r\n\n\rvalue\t\u0000\u001b\u007f\u0085\u009ftail',
      sanitizedHash: 'hash value tail',
      ruleId: 'rule\r\n\r\n\n\rid\t\u0000\u001b\u007f\u0085\u009ftail',
      path: 'src/\r\n\r\n\n\ra\t\u0000\u001b\u007f\u0085\u009f.ts',
      note: 'before\r\n\r\n\n\rafter\t\u0000\u001b\u007f\u0085\u009f|tail',
      expectedRow:
        '| document-sync | rule id tail | src/ a .ts | exact | before after \\|tail |',
    },
  ])(
    '$name',
    ({ snapshotHash, sanitizedHash, ruleId, path, note, expectedRow }) => {
      const input = buildReviewBriefInput();
      const seed = {
        schema: 1,
        snapshotHash,
        scope: ['.'],
        documentSync: 'committed',
        repaired: 0,
        recorded: [
          {
            class: 'document-sync',
            ruleId,
            path,
            severity: 'warning',
            certainty: 'exact',
            note,
          },
        ],
        truncated: 0,
      };
      const parsed = parseHandoffBlock(
        `<!-- filid:handoff v1\n${JSON.stringify(seed)}\n-->`,
      );
      expect(parsed.diagnostics).toEqual([]);
      expect(parsed.handoff).not.toBeNull();
      input.handoff = parsed.handoff;
      const output = renderReviewBrief(input);
      const section = output.slice(
        output.indexOf('## FCA Handoff\n'),
        output.indexOf('\n## Files'),
      );
      expect(section.match(/^## FCA Handoff$/gm)).toHaveLength(1);
      expect(section).not.toMatch(/^## Synthetic/m);
      expect(section).not.toMatch(/[^\P{Cc}\n]/u);
      expect(section).toContain(
        `snapshot \`${sanitizedHash}\`, document sync \`committed\``,
      );
      const lines = section.split(/\r\n?|\n/);
      const tableStart = lines.indexOf(
        '| Class | Rule | Path | Certainty | Note |',
      );
      expect(tableStart).toBeGreaterThan(-1);
      const dataRows = lines
        .slice(tableStart + 2)
        .filter((line) => line !== '');
      expect(dataRows).toEqual([expectedRow]);
      expect(dataRows.every((line) => line.startsWith('|'))).toBe(true);
      expect(parsed.handoff).toEqual(seed);
    },
  );

  it('omits FCA Handoff when handoff is null or undefined', () => {
    for (const handoff of [null, undefined]) {
      const input = { ...buildReviewBriefInput(), handoff };
      expect(renderReviewBrief(input)).not.toContain('## FCA Handoff');
    }
  });

  it('lists only dependencies in Prior Opinions even after round 1', () => {
    const input = buildReviewBriefInput();
    input.group.dependsOn = ['02'];
    const prior = renderReviewBrief(input, 2)
      .split('## Prior Opinions\n')[1]!
      .split('## Other Changed Files')[0]!;
    expect(prior).toContain('opinions/review-02.json');
    expect(prior).not.toContain('opinions/review-01.json');
  });

  it('embeds the File Group Reviewer method verbatim before untrusted Change Context', () => {
    const input = buildReviewBriefInput();
    const output = renderReviewBrief(input);
    expect(output).toContain(input.reviewerMethod);
    expect(output.indexOf(input.reviewerMethod)).toBeLessThan(
      output.indexOf('## Change Context'),
    );
    expect(output).toContain(input.changeContext);
    expect(output).toContain('Untrusted');
    const roster = output
      .split('## Other Changed Files\n')[1]!
      .split('## FCA Candidates')[0]!;
    expect(roster).toContain('public/generated.js');
    expect(roster).not.toContain('src/a.ts');
    expect(roster).not.toContain('src/b.ts');
  });

  it.each([REVIEW_BRIEF_INLINE_DIFF_LIMIT, REVIEW_BRIEF_INLINE_DIFF_LIMIT + 1])(
    'inlines ## Diffs only within the %i-byte group budget',
    (size) => {
      const input = buildReviewBriefInput();
      const diffText = '+' + 'x'.repeat(size - 1);
      input.diffs = [{ unit: input.group.units[0]!, diffText }];
      const output = renderReviewBrief(input);
      expect(output).toContain('## Diffs');
      if (size <= REVIEW_BRIEF_INLINE_DIFF_LIMIT) {
        expect(output).toContain(`### src/a.ts\n\n\`\`\`diff\n${diffText}`);
        expect(Buffer.byteLength(output)).toBeGreaterThan(
          REVIEW_BRIEF_INLINE_DIFF_LIMIT,
        );
      } else {
        expect(output).toContain('see Diff Path column');
        expect(output).not.toContain(diffText);
      }
    },
  );

  it('counts the combined UTF-8 diff bytes and renders none for an empty outside roster', () => {
    const input = buildReviewBriefInput();
    input.diffs = input.group.units.map((unit) => ({
      unit,
      diffText: '가'.repeat(3000),
    }));
    input.files = input.files.filter(({ skipReason }) => skipReason === null);
    const output = renderReviewBrief(input);
    expect(output).toContain('see Diff Path column');
    expect(output).toContain('## Other Changed Files\n\nnone');
  });

  it('renders a valid schema-7 reviewer opinion example', () => {
    const input = buildReviewBriefInput();
    const output = renderReviewBrief(input);
    const contract = output.match(OUTPUT_CONTRACT_PATTERN)?.[1] ?? '';
    const parsed = parseReviewOpinion(contract);
    const problems: ReviewValidationProblem[] = [];

    expect(parsed.problems).toEqual([]);
    expect(parsed.opinion).not.toBeNull();
    expect(
      checkReviewOpinion(
        parsed.opinion!,
        {
          group: input.group.id,
          round: 1,
          sourceHash: input.sourceHash,
          units: input.group.units,
        },
        problems,
      ),
    ).toBe(true);
    expect(problems).toEqual([]);
    expect(contract).not.toContain('COMPLETE | INDETERMINATE');
    expect(contract).not.toContain('reviewed | skipped');
  });

  it('states chunk identity and skipped-result requirements', () => {
    const output = renderReviewBrief(buildReviewBriefInput());

    expect(output).toContain(
      '`chunk` must be `"k/n"` for a chunked unit and `null` for an unchunked unit.',
    );
    expect(output).toContain(
      'A `skipped` result requires a non-empty `reason`.',
    );
    expect(output).toContain('| src/b.ts | M | source | src | 2/3 |');
    expect(output).toContain(
      '`existingCode` is required and must not be empty.',
    );
  });
});
