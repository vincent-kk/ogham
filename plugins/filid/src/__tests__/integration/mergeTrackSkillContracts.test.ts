import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

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
      .find((line) => line.startsWith('| `cached`'));

    expect(cached).toContain('Step 5');
    expect(cached).toContain('Step 6');
    expect(cached).not.toContain('then stop');
    expect(cached).toMatch(/without[^.]*review/iu);
  });
});
