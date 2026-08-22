import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const resolveSkill = readFileSync(
  join(packageRoot, 'skills/resolve/SKILL.md'),
  'utf8',
);
const resolveReference = readFileSync(
  join(packageRoot, 'skills/resolve/reference.md'),
  'utf8',
);
const pipelineSkill = readFileSync(
  join(packageRoot, 'skills/pipeline/SKILL.md'),
  'utf8',
);
const pipelineReference = readFileSync(
  join(packageRoot, 'skills/pipeline/reference.md'),
  'utf8',
);

function linesContaining(document: string, value: string): string[] {
  return document.split('\n').filter((line) => line.includes(value));
}

function between(
  document: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = document.indexOf(startMarker);
  const end = document.indexOf(endMarker, start + startMarker.length);

  return start >= 0 && end > start ? document.slice(start, end) : '';
}

function normalized(document: string): string {
  return document.replace(/\s+/g, ' ').trim();
}

describe('resolve skill batch decision flow', () => {
  it('owns one interactive site for the whole decision batch', () => {
    const interactionMarkers = linesContaining(resolveSkill, '[INTERACTIVE]');
    const promptSites = linesContaining(resolveSkill, 'AskUserQuestion').filter(
      (line) => !line.includes('[INTERACTIVE]'),
    );
    const batchSection = between(
      resolveSkill,
      '<!-- resolve:batch-decision:start -->',
      '<!-- resolve:batch-decision:end -->',
    );

    expect(interactionMarkers).toHaveLength(1);
    expect(promptSites).toHaveLength(1);
    expect(batchSection).toContain(interactionMarkers[0]);
    expect(batchSection).toContain(promptSites[0]);
  });

  it('parses every fix and renders the sheet before prompting', () => {
    const parsed = resolveSkill.indexOf('<!-- resolve:all-fixes-ready -->');
    const rendered = resolveSkill.indexOf('<!-- resolve:decision-sheet -->');
    const autoDecision = resolveSkill.indexOf('<!-- resolve:auto-decision -->');
    const interactive = resolveSkill.indexOf('<!-- [INTERACTIVE]');
    const rejectionsValidated = resolveSkill.indexOf(
      '<!-- resolve:rejections-validated -->',
    );
    const batchEnd = resolveSkill.indexOf(
      '<!-- resolve:batch-decision:end -->',
    );
    const correctionStep = resolveSkill.indexOf(
      '## Step 4 — Capture the baseline, then delegate',
    );
    const rejectionStep = between(resolveSkill, '## Step 5', '## Step 6');

    expect(parsed).toBeGreaterThan(-1);
    expect(rendered).toBeGreaterThan(parsed);
    expect(autoDecision).toBeGreaterThan(rendered);
    expect(interactive).toBeGreaterThan(autoDecision);
    expect(rejectionsValidated).toBeGreaterThan(interactive);
    expect(batchEnd).toBeGreaterThan(rejectionsValidated);
    expect(correctionStep).toBeGreaterThan(batchEnd);
    expect(rejectionStep).toContain('<!-- resolve:rejections-from-batch -->');
    expect(rejectionStep).toContain(
      '<!-- resolve:serialize-rejections-only -->',
    );
    expect(linesContaining(rejectionStep, 'AskUserQuestion')).toEqual([]);
    expect(rejectionStep).not.toContain('Step 3');
  });

  it('defines an independent recommendation and arbitrary-size batch grammar', () => {
    const reference = normalized(resolveReference);
    const batchSection = normalized(
      between(
        resolveSkill,
        '<!-- resolve:batch-decision:start -->',
        '<!-- resolve:batch-decision:end -->',
      ),
    );
    const optionBlock = between(
      resolveSkill,
      'with exactly two fixed options:',
      "The host's automatic",
    );
    const optionLabels = optionBlock
      .split('\n')
      .map((line) => line.match(/^- \*\*([^*]+)\*\*/)?.[1])
      .filter((label): label is string => label !== undefined);

    expect(reference).toContain(
      '| Default | ID | Severity | Perspective | Recommendation | Path |',
    );
    expect(reference).toContain(
      'Consequence: <specific broken contract or boundary>',
    );
    expect(reference).toContain('Recommended Action: <bounded correction>');
    expect(reference).toContain('Recommendation reason: <one sentence>');
    expect(reference).toContain('| Clear-cut or low-impact | Apply | `[x]` |');
    expect(reference).toContain(
      '| Material choice or trade-off | Discuss | `[?]` |',
    );
    expect(reference).toContain(
      'apply FIX-001,FIX-004; discuss FIX-002: <question>; skip FIX-003: <reason>; reject FIX-005: <reason>',
    );
    expect(reference).toContain('Omitted IDs keep their displayed defaults');
    expect(reference).toContain('tries to skip an error');
    expect(reference).toContain('omits a skip/reject reason');
    expect(optionLabels).toEqual(['Apply recommended set', 'Apply every item']);
    expect(batchSection).toContain(
      're-render only the still-unresolved items in one batch',
    );
    expect(batchSection).toContain(
      'return the whole invalid set in one response',
    );
    expect(batchSection).toContain('but not skipped');
  });

  it('keeps recommendations visible while pipeline auto-selects decisions', () => {
    const autoSection = normalized(
      between(
        resolveSkill,
        '<!-- resolve:auto-decision -->',
        '<!-- [INTERACTIVE]',
      ),
    );
    const pipelineEntry = normalized(pipelineSkill);
    const pipelineDetail = normalized(pipelineReference);

    expect(autoSection).toContain('Recommendation');
    expect(autoSection).toContain('[x] Apply (auto-selected)');
    expect(autoSection).toContain('without prompting');

    for (const document of [pipelineEntry, pipelineDetail]) {
      expect(document).toContain('--auto');
      expect(document).toContain('decision sheet');
      expect(document).toContain('batch');
      expect(document).toContain('opens no prompt');
    }
  });
});
