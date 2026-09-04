import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const crossReviewRoot = join(packageRoot, 'skills/cross-review');
const calibrationRoot = join(
  packageRoot,
  '../../.metadata/filid/cross-review-calibration',
);
const requiredFiles = [
  'SKILL.md',
  'templates.md',
  'reviewers/reviewer.md',
  'reviewers/verifier.md',
  'rules/default.md',
  'rules/documents.md',
  'rules/fca.md',
  'rules/tests.md',
];
const documents = requiredFiles.map((path) => ({
  path,
  content: readFileSync(join(crossReviewRoot, path), 'utf8'),
}));
const skill = documents.find(({ path }) => path === 'SKILL.md')?.content ?? '';
const templates =
  documents.find(({ path }) => path === 'templates.md')?.content ?? '';
const reviewer =
  documents.find(({ path }) => path === 'reviewers/reviewer.md')?.content ?? '';
const verifier =
  documents.find(({ path }) => path === 'reviewers/verifier.md')?.content ?? '';
const genuineGap = readFileSync(
  join(calibrationRoot, 'genuine-gap.md'),
  'utf8',
);

describe('cross-review v6 skill surface', () => {
  it('declares the v6 frontmatter version', () => {
    expect(skill).toMatch(/^version: '6\.0\.0'$/m);
  });

  it('contains exactly the eight required Markdown files', () => {
    const actualFiles = [
      ...readdirSync(crossReviewRoot)
        .filter((name) => name.endsWith('.md'))
        .map((name) => join(crossReviewRoot, name)),
      ...readdirSync(join(crossReviewRoot, 'reviewers')).map((name) =>
        join(crossReviewRoot, 'reviewers', name),
      ),
      ...readdirSync(join(crossReviewRoot, 'rules')).map((name) =>
        join(crossReviewRoot, 'rules', name),
      ),
    ].map((path) => relative(crossReviewRoot, path).replaceAll('\\', '/'));

    expect(actualFiles.sort()).toEqual([...requiredFiles].sort());
  });

  it('removes procedural files and keeps calibration outside the skill tree', () => {
    for (const name of [
      'contracts.md',
      'specification.md',
      'reference.md',
      'phases',
      'calibration',
    ])
      expect(existsSync(join(crossReviewRoot, name))).toBe(false);
    expect(
      readFileSync(join(calibrationRoot, 'calibration.md'), 'utf8'),
    ).toContain('런타임 스킬 트리 밖');
  });

  it('contains no persona-spawn or internal command residue', () => {
    const allText = documents.map(({ content }) => content).join('\n');
    const internalCommands = (allText.match(/filid:[a-z]+/g) ?? []).filter(
      (value) => value !== 'filid:lang',
    );

    expect(allText).not.toContain('subagent_type');
    expect(internalCommands).toEqual([]);
  });

  it('preserves the eight-field fix-request block', () => {
    const fields = [
      'Severity',
      'Category',
      'Path',
      'Rule',
      'Claim',
      'Evidence',
      'Consequence',
      'Recommended Action',
    ];

    for (const field of fields) expect(templates).toContain(`- **${field}**:`);
  });

  it('keeps re-verification mode before the normal deliverable', () => {
    expect(verifier.indexOf('## Re-verification Mode')).toBeGreaterThan(-1);
    expect(verifier.indexOf('## Re-verification Mode')).toBeLessThan(
      verifier.indexOf('## Deliverable'),
    );
  });

  it('defines the ordered verdict table exactly once', () => {
    const allText = documents.map(({ content }) => content).join('\n');
    expect(
      allText.match(
        /\|\s*Condition \(evaluate in order\)\s*\|\s*Verdict\s*\|/g,
      ),
    ).toHaveLength(1);
  });

  it('requires review_schema 6 in orchestration prose', () => {
    expect(skill).toContain('review_schema: 6');
  });

  it('limits each role to its group rows in canonical evidence', () => {
    const groupRows = 'rows whose `Path` belongs to your group; skip every other section.';

    expect(reviewer).toContain(
      `Read only the \`evidence.md\` frontmatter and the \`## Changed Scope\`, \`## Candidates\`, and \`## Informational\` ${groupRows}`,
    );
    expect(verifier).toContain(
      `Read only the \`evidence.md\` frontmatter and the \`## Changed Scope\` and \`## Candidates\` ${groupRows}`,
    );
  });

  it('stops every unrecognized scope response without a verdict', () => {
    const branch =
      'For every other response that is not `status: ok` with `disposition: scoped`, stop, report its diagnostics, and emit no verdict.';

    expect(skill.split(branch)).toHaveLength(2);
  });

  it('resumes from the first missing review artifact', () => {
    const artifactRule =
      'continue at Step 2 when `evidence.md` is missing, at Step 3 for every group whose `opinions/review-NN.md` is missing, at Step 4 for every group whose `opinions/verify-NN.md` is missing, otherwise at Step 5';

    expect(skill).toContain(artifactRule);
    expect(skill).not.toContain('first incomplete step');
  });

  it('keeps the verifier model hint only in orchestration prose', () => {
    expect(skill.match(/sonnet/g)).toHaveLength(1);
    expect(verifier).not.toContain('## Spawn');
    expect(verifier).not.toContain('sonnet');
  });

  it('uses indeterminate verification evidence for the genuine-gap fixture', () => {
    expect(genuineGap).toContain('it.each(loadRows())');
    expect(genuineGap).toContain('expect(slugify(input)).toBe(expected);');
    expect(genuineGap).toContain('`verification_status: indeterminate`');
    expect(genuineGap).not.toContain('resolves no verification role');
  });

  it('bounds actor reads and reports publication status in terminal output', () => {
    for (const instruction of [
      '`templates.md` owns every persisted artifact and publication format; read it once in Step 2 and reuse it.',
      '`reviewers/reviewer.md`, `reviewers/verifier.md`, and `rules/*.md` are read by the spawned reviewer and verifier, never by this orchestrator: pass their absolute paths, not their text. Do not list or re-read this skill directory.',
      'Resolve `BASE_REF` from `--base`; otherwise read the remote list once and try the remote default, `origin/main`, then `origin/master`, and verify the selected ref. Record whether any remote exists and carry it to Step 6; when there is none, Step 6 reports `pr-comment: none` without another call.',
      'This payload is the authoritative roster: do not open `evidence.md` or re-derive role, owner, churn, or candidate counts with git, find, or sed.',
      'Instruct the reviewer to read the role file, `templates.md`, and every resolved rule file in one batched command before anything else.',
      'Validation reads the opinion only; do not re-open the diff or the reviewed source.',
      'State the assigned candidate count as authoritative. When it is zero and `review-NN.md` lists no findings, instruct the verifier to write the `COMPLETE` artifact with `decisions: []` after reading only `review-NN.md`.',
    ])
      expect(skill).toContain(instruction);

    expect(verifier).toContain(
      'Read the role file and `../templates.md` in one batched command. When the brief assigns zero candidates and `review-NN.md` lists no findings, open no further file.',
    );
    expect(templates).toContain(
      'Finalize the checklist by rewriting the whole `## Review Checklist` block in one write, not by in-place substitution.',
    );
    expect(templates).toContain(
      'Review verdict: APPROVED\npr-comment: none',
    );
  });
});
