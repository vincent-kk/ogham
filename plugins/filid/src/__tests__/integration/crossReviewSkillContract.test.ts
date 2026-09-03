import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const skillRoot = join(packageRoot, 'skills');
const crossReviewRoot = join(packageRoot, 'skills/cross-review');

const documents = {
  detail: readFileSync(join(packageRoot, 'DETAIL.md'), 'utf8'),
  skill: readFileSync(join(crossReviewRoot, 'SKILL.md'), 'utf8'),
  contracts: readFileSync(join(crossReviewRoot, 'contracts.md'), 'utf8'),
  templates: readFileSync(join(crossReviewRoot, 'templates.md'), 'utf8'),
  specification: readFileSync(
    join(crossReviewRoot, 'specification.md'),
    'utf8',
  ),
  reviewer: readFileSync(
    join(crossReviewRoot, 'reviewers/reviewer.md'),
    'utf8',
  ),
  verifier: readFileSync(
    join(crossReviewRoot, 'reviewers/verifier.md'),
    'utf8',
  ),
  genuineGap: readFileSync(
    join(crossReviewRoot, 'calibration/genuine-gap.md'),
    'utf8',
  ),
  resolve: readFileSync(join(skillRoot, 'resolve/SKILL.md'), 'utf8'),
  resolveReference: readFileSync(
    join(skillRoot, 'resolve/reference.md'),
    'utf8',
  ),
  revalidate: readFileSync(join(skillRoot, 'revalidate/SKILL.md'), 'utf8'),
  revalidateReference: readFileSync(
    join(skillRoot, 'revalidate/reference.md'),
    'utf8',
  ),
};

function between(document: string, start: string, end?: string): string {
  const from = document.indexOf(start);
  const to = end === undefined ? document.length : document.indexOf(end, from);
  return document.slice(from, to < 0 ? document.length : to);
}

describe('cross-review v5 orchestration contract', () => {
  it('merges every reviewer result into the canonical session checklist', () => {
    const step = between(documents.skill, '## Step 3', '## Step 4');

    expect(step).toContain(
      'Then merge each assigned file result into `session.md` under `## Review Checklist` exactly once, keyed by `(path, status)`.',
    );
    expect(step).not.toMatch(/do not merge.*Review Checklist/i);
  });

  it('invalidates resumable and cached artifacts from older schemas', () => {
    const step = between(documents.skill, '## Step 1', '## Step 2');
    const sessionTemplate = between(
      documents.templates,
      '## `session.md`',
      '## Evidence Artifacts',
    );
    const reportTemplate = between(
      documents.templates,
      '## `review-report.md`',
      '## `fix-requests.md`',
    );
    const lifecycle = between(
      documents.contracts,
      '## Review-State Lifecycle',
      '## Evidence Identity',
    );

    expect(sessionTemplate).toContain('review_schema: 5');
    expect(reportTemplate).toContain('review_schema: 5');
    expect(lifecycle).toContain(
      'Canonical v5 `session.md` and `review-report.md` frontmatter carry literal `review_schema: 5`.',
    );
    expect(documents.specification).toContain(
      'v5 resumes or returns only artifacts carrying `review_schema: 5`',
    );
    expect(documents.specification).toContain('| `review_schema` | literal `5` |');
    expect(step).toMatch(/resumable.*`review_schema: 5`/is);
    expect(step).toMatch(/cached.*`review_schema: 5`/is);
    expect(step).toContain('prepare(force: true)');
    expect(step).not.toContain('force: <true only with --force>');
  });

  it('restarts stale state from the context-capture step', () => {
    const step = between(documents.skill, '## Step 5', '## Step 6');

    expect(step).toMatch(/restart (?:the run )?at Step 1/i);
    expect(step).not.toMatch(/restart (?:the run )?at Step 2/i);
  });

  it('passes current user instructions to reviewers as host authority', () => {
    const step = between(documents.skill, '## Step 3', '## Step 4');

    expect(step).toMatch(/current user instructions/i);
    expect(documents.reviewer).toMatch(/current user instructions/i);
    expect(documents.reviewer).toMatch(/host-supplied/i);
  });

  it('gives user requirements stable IDs and passes them to verifiers', () => {
    const ruleLayers = between(
      documents.contracts,
      '## Rule Layers',
      '## Finding Fields',
    );
    const reviewContract = between(
      documents.contracts,
      '## Review Contract',
      '## Candidate Promotion',
    );
    const verificationStep = between(documents.skill, '## Step 4', '## Step 5');

    expect(ruleLayers).toContain('USR-NNN');
    expect(reviewContract).toContain('rule: <USR-NNN');
    expect(verificationStep).toMatch(/current user instructions.*USR-NNN/is);
    expect(documents.verifier).toMatch(
      /host-supplied authoritative.*current user instructions.*USR-NNN/is,
    );
  });

  it('normalizes missing FCA candidate fields without invention', () => {
    const promotion = between(
      documents.contracts,
      '## Candidate Promotion',
      '## Verification Contract',
    );

    expect(promotion).toContain(
      'When it omits `lines`, set `lines: unknown`.',
    );
    expect(promotion).toContain(
      'When it omits `message`, `consequence`, or `recommended_action`, fill only the omitted field from this category-specific fixed table',
    );
  });

  it('deduplicates candidates with deterministic identity and field rules', () => {
    const promotion = between(
      documents.contracts,
      '## Candidate Promotion',
      '## Verification Contract',
    );

    expect(promotion).toMatch(/FCA-NNN.*identity/is);
    expect(promotion).toMatch(/lowest.*R<NN>-<NNN>/is);
    expect(promotion).toMatch(/error.*warning/is);
    expect(promotion).toMatch(/merge.*evidence/is);
  });

  it('represents reviewer failure without falsely completing coverage', () => {
    const contract = between(
      documents.contracts,
      '## Review Contract',
      '## Candidate Promotion',
    );

    expect(contract).toContain('result: reviewed | skipped | unavailable');
    expect(contract).toContain('result: unavailable');
    expect(contract).toMatch(/session.*pending/is);
  });

  it('keeps normal evidence gaps distinct from mechanical unavailability', () => {
    const contract = between(
      documents.contracts,
      '## Review Contract',
      '## Candidate Promotion',
    );
    const verdicts = between(
      documents.contracts,
      '## Verdict Derivation',
      '## Prompt Rules',
    );

    expect(documents.reviewer).toMatch(
      /required evidence cannot be obtained.*`result: reviewed`.*gap/is,
    );
    expect(documents.reviewer).not.toMatch(
      /required evidence cannot be obtained.*record `unavailable`/is,
    );
    expect(contract).toMatch(/every reviewer gap is in scope by construction/i);
    expect(verdicts).toMatch(/any in-scope reviewer gap/i);
    expect(documents.genuineGap).not.toContain('result: unavailable');
  });

  it('defines evidence incompleteness and warning uncertainty verdicts', () => {
    const verdicts = between(
      documents.contracts,
      '## Verdict Derivation',
      '## Prompt Rules',
    );
    const orchestrationVerdicts = between(
      documents.skill,
      'Derive the verdict in the exact order',
      'Write `review-report.md`',
    );

    expect(verdicts).toContain('evidence_complete: false');
    expect(verdicts).toMatch(/warning.*INDETERMINATE.*APPROVED/is);
    expect(orchestrationVerdicts).toContain('evidence_complete: false');
    expect(orchestrationVerdicts).toMatch(
      /every candidate is either `REFUTED` or a `warning` with an `INDETERMINATE` decision/i,
    );
  });

  it('allows only bounded host-scratch diff captures outside review state', () => {
    expect(documents.contracts).toMatch(/host scratch.*transient/is);
    expect(documents.specification).toMatch(/host scratch.*transient/is);
  });

  it('gives re-verification a separate return contract', () => {
    const mode = between(documents.verifier, '## Re-verification Mode');

    expect(documents.verifier.indexOf('## Re-verification Mode')).toBeLessThan(
      documents.verifier.indexOf('## Deliverable'),
    );
    expect(mode).toMatch(/return exactly one/i);
    expect(mode).toMatch(/do not write.*opinions\/verify/is);
  });

  it('joins accepted FIX IDs to the complete original finding payload', () => {
    const fixRequest = between(
      documents.templates,
      '## `fix-requests.md`',
      '## PR Comment',
    );
    const resolveInput = between(
      documents.resolve,
      '## Step 2',
      '## Step 3',
    );
    const revalidateInput = between(
      documents.revalidate,
      '## Step 1',
      '## Step 2',
    );
    const verifierMode = between(
      documents.verifier,
      '## Re-verification Mode',
      '## Deliverable',
    );
    const requiredFields = [
      'Severity',
      'Category',
      'Path',
      'Rule',
      'Claim',
      'Evidence',
      'Consequence',
      'Recommended Action',
    ];

    for (const field of requiredFields) {
      expect(fixRequest).toContain(`- **${field}**:`);
      expect(resolveInput).toContain(field);
      expect(revalidateInput).toContain(field);
    }
    expect(verifierMode).toContain(
      'the original finding, including its ID, category, severity, path, rule, claim, evidence, consequence, and recommended action',
    );
    expect(revalidateInput).toContain('fix-requests.md');
    expect(revalidateInput).toMatch(/join.*accepted.*FIX.*ID/is);
    expect(revalidateInput).toMatch(/complete original finding payload/i);
    expect(documents.resolveReference).toMatch(/accepted FIX ID/i);
    expect(documents.revalidateReference).toMatch(
      /accepted FIX ID.*exactly one canonical.*complete original finding payload/is,
    );
  });

  it('documents non-FCA re-verification in the root contract', () => {
    expect(documents.detail).toMatch(
      /비-FCA category는 accepted FIX ID를 canonical fix request와 결합해 원 finding 전체를 복원하고 verifier 재검증으로 판정한다/,
    );
    expect(documents.detail).toContain(
      'Severity, Category, Path, Rule, Claim, Evidence, Consequence, Recommended Action',
    );
  });

  it('keeps one canonical terminal output format', () => {
    const step = between(documents.skill, '## Step 6', '## Options');

    expect(step).toContain('Terminal Output');
    expect(step).not.toContain('Then emit exactly:');
    expect(documents.templates).toContain('## Terminal Output');
  });
});
