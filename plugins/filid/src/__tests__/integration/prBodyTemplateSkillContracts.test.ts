/** Canonical skill instructions are the executable wiring for PR body generation. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/** Loader input for the PR body layout and budget contract. */
const pullRequestReference = readFileSync(
  fileURLToPath(
    new URL('../../../skills/pull-request/reference.md', import.meta.url),
  ),
  'utf8',
);
/** Loader input for PR body construction and caller options. */
const pullRequest = readFileSync(
  fileURLToPath(
    new URL('../../../skills/pull-request/SKILL.md', import.meta.url),
  ),
  'utf8',
);
/** Loader input for merge-track forwarding into PR creation. */
const pipeline = readFileSync(
  fileURLToPath(new URL('../../../skills/pipeline/SKILL.md', import.meta.url)),
  'utf8',
);
/** Loader input for the current Filid PR reporting contract. */
const detail = readFileSync(
  fileURLToPath(new URL('../../../DETAIL.md', import.meta.url)),
  'utf8',
);

describe('PR body template skill contracts', () => {
  it('keeps the five open sections before the four collapsed regions', () => {
    const section = pullRequestReference.split('## §3')[1].split('## §4')[0];
    const skeleton = section.split('```markdown')[1].split('\n```')[0];
    const markers = [
      '## Summary',
      '## Links',
      '## Contract',
      '## Review notes',
      '## Verification',
      '<summary><b>Changes</b>',
      '<summary>Screenshots</summary>',
      '<summary>Work context</summary>',
      '## FCA Handoff',
    ];

    let prior = -1;
    for (const marker of markers) {
      const current = skeleton.indexOf(marker);
      expect(current, marker).toBeGreaterThan(prior);
      prior = current;
    }
    expect(skeleton).not.toMatch(/^## Changes$/m);
  });

  it('documents every Changes kind', () => {
    for (const kind of [
      'removed',
      'new',
      'moved',
      'boundary',
      'test',
      'behavior',
    ]) {
      expect(pullRequestReference).toContain(`\`${kind}\``);
    }
  });

  it('uses the approved body fold order and removes the former budget wording', () => {
    expect(pullRequestReference).toContain(
      'Fold order: Work context, Screenshots, Changes, mermaid, Review notes, scope, Verification, Approach.',
    );
    expect(pullRequestReference).not.toContain(
      'Architecture, Code, and Test use the remaining space',
    );
  });

  it('exposes the six caller options at version 2.2.0', () => {
    const options = pullRequest
      .split('## Options')[1]
      .split('## Invariants')[0];
    for (const option of [
      '--issue',
      '--spec',
      '--decision',
      '--screenshot',
      '--focus',
      '--notes',
    ]) {
      expect(options).toContain(`\`${option}`);
    }
    expect(pullRequest).toContain("version: '2.2.0'");
  });

  it('forbids inferring caller-authored sections from code', () => {
    const invariants = pullRequest
      .split('## Invariants')[1]
      .split('## Terminal Output')[0];
    expect(invariants).toContain('never inferred from code');
  });

  it('forwards caller inputs through the pipeline unchanged', () => {
    expect(pipeline).toContain(
      '`--issue`, `--spec`, `--decision`, `--screenshot`, `--focus`, and `--notes` are forwarded to `pr-create` unchanged.',
    );
  });

  it('names Changes as the current PR analysis surface', () => {
    expect(detail).not.toContain('Code/Architecture 분석');
  });
});
