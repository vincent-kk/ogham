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
      allText.match(/\| Condition \(evaluate in order\) \| Verdict \|/g),
    ).toHaveLength(1);
  });

  it('requires review_schema 6 in orchestration prose', () => {
    expect(skill).toContain('review_schema: 6');
  });

  it('limits each role to its group rows in canonical evidence', () => {
    const instruction =
      'Read only the `evidence.md` frontmatter and the `## Changed Scope` and `## Candidates` rows whose `Path` belongs to your group; skip every other section.';

    expect(reviewer).toContain(instruction);
    expect(verifier).toContain(instruction);
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
});
