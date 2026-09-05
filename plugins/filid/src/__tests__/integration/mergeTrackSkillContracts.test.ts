import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseHandoffBlock } from '../../mcp/tools/reviewState/scope/parseHandoffBlock.js';
import { REVIEW_HANDOFF_SEED_SCHEMA } from '../../mcp/tools/reviewState/scope/reviewHandoffSeedSchema.js';

/** Canonical instruction root exercised by the skill loader. */
const skillsRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../skills',
);
/** PR workflow whose publication must include its own document commit. */
const pullRequest = readFileSync(
  join(skillsRoot, 'pull-request/SKILL.md'),
  'utf8',
);
/** PR body and handoff writer format consumed by cross-review. */
const pullRequestReference = readFileSync(
  join(skillsRoot, 'pull-request/reference.md'),
  'utf8',
);
/** Merge-track continuation contract for document synchronization outcomes. */
const pipelineReference = readFileSync(
  join(skillsRoot, 'pipeline/reference.md'),
  'utf8',
);
/** Child-skill invocation contract used after resolve decisions are final. */
const resolveReference = readFileSync(
  join(skillsRoot, 'resolve/reference.md'),
  'utf8',
);
/** Quality partition applied to existing and absent module documents. */
const enrichment = readFileSync(
  join(skillsRoot, 'enrich-docs/reference.md'),
  'utf8',
);
/** Cross-review orchestrator consuming bounded MCP envelopes. */
const crossReview = readFileSync(
  join(skillsRoot, 'cross-review/SKILL.md'),
  'utf8',
);
/** FCA review rules for confirming handoff claims against evidence. */
const fcaRules = readFileSync(
  join(skillsRoot, 'cross-review/rules/fca.md'),
  'utf8',
);
/** Document review rules for boundary drafts and contract placement. */
const documentRules = readFileSync(
  join(skillsRoot, 'cross-review/rules/documents.md'),
  'utf8',
);
/** Reviewer method governing how handoff claims enter the review. */
const reviewerMethod = readFileSync(
  join(skillsRoot, 'cross-review/reviewers/reviewer.md'),
  'utf8',
);

describe('merge-track skill recovery contracts', () => {
  it('re-observes remote state after document sync and before publication', () => {
    const publication = pullRequest.split('## Stage 4 — PR Publication')[1];
    const observation = publication.indexOf(
      'git rev-list --count origin/<BRANCH>..HEAD',
    );
    const push = publication.indexOf('git push -u origin <BRANCH>');

    expect(observation).toBeGreaterThanOrEqual(0);
    expect(push).toBeGreaterThan(observation);
    expect(publication).toContain('UNPUSHED = false');
    expect(publication).toContain('--no-push');
  });

  it('includes DETAIL when pull-request calls document synchronization', () => {
    const invocation = pullRequest.match(
      /Skill\("filid:enrich-docs", "([^"]+)"\)/u,
    );

    expect(invocation?.[1].split(/\s+/u)).toContain('--include-detail');
  });

  it('includes DETAIL in the resolve document route', () => {
    const route = resolveReference
      .split('\n')
      .find((line) => line.startsWith('| `/filid:enrich-docs`'));

    expect(route).toContain('--include-detail');
    expect(route).not.toContain('path only');
  });

  it('propagates automatic approval to both child skills only in auto mode', () => {
    const routing = resolveReference
      .split('## §5 Delegation brief format')[1]
      .split('## §6 Severity gate')[0];

    expect(routing).toMatch(/--auto[^\n]*--auto-approve/u);
    expect(routing).toContain('both child skills');
    expect(routing).toMatch(/interactive[^\n]*omit[^\n]*--auto-approve/iu);
  });

  it('keeps an existing zero-score document in the editable quality partition', () => {
    expect(enrichment).toMatch(/^0 <= score < min-quality\s+SPARSE$/mu);
    expect(enrichment).toMatch(/^document absent\s+MISSING$/mu);
    expect(enrichment).toContain('SPARSE or MISSING');
  });

  it('recovers omitted data for every MCP response before using its fields', () => {
    const recovery = crossReview.indexOf('For every MCP response');
    const firstUse = crossReview.indexOf('Use `data.reviewDirectory`');
    const contract = crossReview.slice(recovery, firstUse);

    expect(recovery).toBeGreaterThanOrEqual(0);
    expect(firstUse).toBeGreaterThan(recovery);
    expect(contract).toContain('artifact.path');
    expect(contract).toContain('JSON');
    expect(contract).toContain('data');
    expect(contract).toMatch(/missing|unreadable/u);
    expect(contract).toMatch(/stop|diagnostic/u);
  });

  it('recovers cached publication through sealing without another review round', () => {
    const cached = crossReview
      .split('\n')
      .find((line) => line.includes('summary.disposition: cached'));
    const seal = crossReview.indexOf('## Step 4 — Seal');
    const publish = crossReview.indexOf('## Step 5 — Publish');

    expect(cached).toMatch(/cached`, go to Step 4; otherwise go to Step 3/u);
    expect(seal).toBeGreaterThanOrEqual(0);
    expect(publish).toBeGreaterThan(seal);
    expect(cached).not.toContain('then stop');
    expect(crossReview.slice(seal, publish)).toContain('action: "seal"');
  });

  it('never ends document sync with a blocking exit', () => {
    expect(pullRequest).not.toContain('BLOCKED');
    expect(pullRequestReference).not.toContain('BLOCKED');
    expect(pullRequest.split('## Invariants')[1]).toContain(
      'Document sync never blocks PR creation.',
    );
  });

  it('carries unrepaired findings in a handoff section and machine block', () => {
    expect(pullRequestReference).toContain('## FCA Handoff');
    expect(pullRequestReference).toContain('<!-- filid:handoff v1');
    expect(pullRequest.split('## Terminal Output')[1]).toMatch(/^Handoff: /mu);
  });

  it('forwards repair mode to enrich-docs', () => {
    const invocation = pullRequest.match(
      /Skill\("filid:enrich-docs", "([^"]+)"\)/u,
    );
    const tokens = invocation?.[1].split(/\s+/u);

    expect(tokens).toContain('--repair');
    expect(tokens).toContain('--include-detail');
    expect(enrichment).toMatch(/^kind: sparse \| missing \| repair$/mu);
  });

  it('keeps the pipeline moving past every document sync outcome', () => {
    const outcome = pipelineReference
      .split('\n')
      .find(
        (line) =>
          line.split('|')[1]?.trim() ===
          'Document sync failed, declined or partial',
      );

    expect(outcome?.split('|')[2]?.trim()).toMatch(/^Continue\b/u);
    expect(pipelineReference).not.toMatch(
      /Document sync blocked[^\n]*\|\s*Stop/u,
    );
    expect(pipelineReference).toContain('FCA Handoff');
  });

  it('reviews handoff rows as claims and drafts for sufficiency', () => {
    const route = resolveReference
      .split('\n')
      .find((line) => line.startsWith('| `/filid:enrich-docs`'));

    expect(fcaRules).toMatch(/^- \*\*FCA-13 — Handoff claims\*\*/mu);
    expect(fcaRules).toContain('never a finding by itself');
    expect(documentRules).toMatch(
      /^- \*\*DOC-7 — INTENT budget and DETAIL split\*\*/mu,
    );
    expect(reviewerMethod).toContain('## FCA Handoff');
    expect(route).toContain('--repair');
  });

  it('keeps the handoff writer format parseable by the reader schema', () => {
    const lines = pullRequestReference.split('\n');
    const examples: unknown[] = [];

    for (const [index, line] of lines.entries()) {
      if (line.trim() !== '<!-- filid:handoff v1') continue;

      const parsed: unknown = JSON.parse(lines[index + 1]);
      const block = lines.slice(index, index + 3).join('\n');
      const { handoff, diagnostics } = parseHandoffBlock(block);

      expect(REVIEW_HANDOFF_SEED_SCHEMA.safeParse(parsed).success).toBe(true);
      expect(handoff).not.toBeNull();
      expect(diagnostics).toHaveLength(0);
      expect(handoff).toEqual(parsed);
      examples.push(parsed);
    }

    const count = examples.length;

    expect(count).toBe(2);
    expect(examples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          snapshotHash: null,
          documentSync: 'failed',
        }),
        expect.objectContaining({ documentSync: 'committed' }),
      ]),
    );
  });
});
