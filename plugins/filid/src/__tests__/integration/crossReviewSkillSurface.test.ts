import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/** Package root used to resolve the canonical cross-review skill. */
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
/** Canonical runtime directory for the cross-review skill. */
const crossReviewRoot = join(packageRoot, 'skills/cross-review');
/** Calibration fixtures kept outside the runtime skill tree. */
const calibrationRoot = join(
  packageRoot,
  '../../.metadata/filid/cross-review-calibration',
);
/** Complete v7 cross-review skill surface, relative to its root. */
const requiredFiles = [
  'SKILL.md',
  'templates.md',
  'report-formats.md',
  'reviewers/reviewer.md',
  'reviewers/verifier.md',
  'rules/default.md',
  'rules/documents.md',
  'rules/fca.md',
  'rules/tests.md',
  'rules/rules.json',
  'rules/lang/ecmascript.md',
  'rules/lang/workflows.md',
  'rules/lang/manifests.md',
  'rules/lang/shell.md',
] as const;
/** Text-bearing skill documents used for cross-file assertions. */
const documents = requiredFiles
  .filter((path) => path.endsWith('.md'))
  .map((path) => ({
    path,
    content: readFileSync(join(crossReviewRoot, path), 'utf8'),
  }));
/** Orchestrator instructions under test. */
const skill = documents.find(({ path }) => path === 'SKILL.md')?.content ?? '';
/** Canonical actor-output templates under test. */
const templates =
  documents.find(({ path }) => path === 'templates.md')?.content ?? '';
/** Reviewer role instructions under test. */
const reviewer =
  documents.find(({ path }) => path === 'reviewers/reviewer.md')?.content ?? '';
/** Verifier role instructions under test. */
const verifier =
  documents.find(({ path }) => path === 'reviewers/verifier.md')?.content ?? '';
/** Default reviewer rules whose precedence wording is part of the skill contract. */
const defaultRules =
  documents.find(({ path }) => path === 'rules/default.md')?.content ?? '';
/** Stable calibration fixture proving an indeterminate test surface. */
const genuineGap = readFileSync(
  join(calibrationRoot, 'genuine-gap.md'),
  'utf8',
);

describe('cross-review v7 skill surface', () => {
  it('declares the v7 frontmatter and orchestration schema', () => {
    expect(skill).toContain("version: '7.2.0'");
    expect(skill).toContain('review_schema: 7');
    expect(skill).toContain('--effort low|medium|high');
  });

  it('contains exactly the required v7 files', () => {
    const actualFiles = [
      ...readdirSync(crossReviewRoot)
        .filter((name) => name.endsWith('.md'))
        .map((name) => join(crossReviewRoot, name)),
      ...readdirSync(join(crossReviewRoot, 'reviewers')).map((name) =>
        join(crossReviewRoot, 'reviewers', name),
      ),
      ...readdirSync(join(crossReviewRoot, 'rules'))
        .filter((name) => name !== 'lang')
        .map((name) => join(crossReviewRoot, 'rules', name)),
      ...readdirSync(join(crossReviewRoot, 'rules/lang')).map((name) =>
        join(crossReviewRoot, 'rules/lang', name),
      ),
    ].map((path) => relative(crossReviewRoot, path).replaceAll('\\', '/'));

    expect(actualFiles.sort()).toEqual([...requiredFiles].sort());
  });

  it('keeps procedural and calibration material outside the skill tree', () => {
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

  it('keeps verdict precedence and report rendering out of skill prose', () => {
    const allText = documents.map(({ content }) => content).join('\n');

    expect(allText).not.toContain('Condition (evaluate in order)');
    expect(templates).not.toContain('Code Review Governance');
    expect(templates).toContain(
      'formats are defined in [report-formats.md](./report-formats.md)',
    );
  });

  it('preserves the canonical eight-field fix-request block', () => {
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
    expect(templates).toContain('seal renders it');
  });

  it('keeps re-verification mode before the normal verifier deliverable', () => {
    expect(verifier.indexOf('## Re-verification Mode')).toBeGreaterThan(-1);
    expect(verifier.indexOf('## Re-verification Mode')).toBeLessThan(
      verifier.indexOf('## Deliverable'),
    );
  });

  it('keeps the verifier model hint only once in orchestration prose', () => {
    expect(skill.match(/sonnet/g)).toHaveLength(1);
    expect(verifier).not.toContain('## Spawn');
    expect(verifier).not.toContain('sonnet');
  });

  it('gives language-specific review rules explicit precedence', () => {
    expect(defaultRules).toContain('`rules/lang/*.md` takes precedence');
  });

  it('makes the orchestrator path-only and gives reviewers a read boundary', () => {
    expect(skill).toContain(
      'The orchestrator opens no diff, source, rule, or opinion body; it passes paths.',
    );
    expect(reviewer).toContain('## Read boundary');
    expect(reviewer).toContain(
      'orchestrator-supplied output path is authoritative',
    );
    expect(templates).toContain(
      'round 2 or later, use the orchestrator-supplied output path',
    );
    expect(reviewer).toContain('added or modified lines');
    expect(reviewer).toContain('type checker or linter');
    expect(reviewer).toContain('done: <output path>');
    expect(verifier).toContain('done: <output path>');
  });

  it('describes validation retries and authoritative concurrency', () => {
    expect(skill).toContain('summary.concurrency');
    expect(skill).toContain('data.next');
    expect(skill).toContain('data.sealReady');
    expect(skill).toContain('exhausted');
    expect(skill).toContain('validate({ kind: "review", group, round })');
    expect(skill).toContain('validate({ kind: "verify", group })');
    expect(skill).toContain('respawn once');
    expect(skill).toContain('completion notification');
    expect(skill).toContain('do not poll');
  });

  it('uses indeterminate verification evidence for the genuine-gap fixture', () => {
    expect(genuineGap).toContain('it.each(loadRows())');
    expect(genuineGap).toContain('expect(slugify(input)).toBe(expected);');
    expect(genuineGap).toContain('`verification_status: indeterminate`');
    expect(genuineGap).not.toContain('resolves no verification role');
  });

  it('keeps actor and orchestration documents within their line budgets', () => {
    expect(skill.split('\n').length - 1).toBeLessThanOrEqual(120);
    expect(templates.split('\n').length - 1).toBeLessThanOrEqual(110);
    expect(reviewer.split('\n').length - 1).toBeLessThanOrEqual(60);
    expect(verifier.split('\n').length - 1).toBeLessThanOrEqual(80);
  });
});
