import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { renderFixRequests } from '../../../../mcp/tools/reviewState/render/renderFixRequests.js';

import { buildReviewRenderInput } from './helpers/buildReviewRenderInput.js';

/** Package root used to read the canonical skill-owned output template. */
const PACKAGE_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../..',
);

/** Current canonical cross-review template source. */
const TEMPLATES = readFileSync(
  join(PACKAGE_ROOT, 'skills/cross-review/templates.md'),
  'utf8',
);

/**
 * Extract the ordered fix-request field labels from the canonical template.
 *
 * @param markdown Complete cross-review templates document.
 * @returns Exact ordered labels from the fix-request example block.
 */
function readCanonicalFixLabels(markdown: string): string[] {
  const section = markdown
    .split('## `fix-requests.md`')[1]
    ?.split('## PR Comment')[0];
  return Array.from(
    section?.matchAll(/^- \*\*([^*]+)\*\*:/gm) ?? [],
    (match) => match[1] ?? '',
  );
}

describe('renderFixRequests', () => {
  it('returns null for every verdict except REQUEST_CHANGES', () => {
    const input = buildReviewRenderInput();

    for (const verdict of ['APPROVED', 'INCONCLUSIVE'] as const)
      expect(
        renderFixRequests({
          ...input,
          fold: { ...input.fold, verdict },
        }),
      ).toBeNull();
  });

  it('numbers confirmed findings deterministically in joined-decision order', () => {
    const input = buildReviewRenderInput();
    const output = renderFixRequests(input);

    expect(output).not.toBeNull();
    if (output === null) throw new Error('Expected REQUEST_CHANGES output.');
    expect(renderFixRequests(input)).toBe(output);
    expect(output.match(/^## FIX-\d{3}:/gm)).toEqual([
      '## FIX-001:',
      '## FIX-002:',
    ]);
    expect(output.indexOf('## FIX-001: USR-Z at `src/z.ts`')).toBeLessThan(
      output.indexOf('## FIX-002: USR-A at `src/a.ts`'),
    );
    expect(output).not.toContain('FIX-003');
  });

  it('preserves the canonical eight labels and escapes claim formatting', () => {
    const output = renderFixRequests(buildReviewRenderInput());
    const renderedLabels = Array.from(
      output?.matchAll(/^- \*\*([^*]+)\*\*:/gm) ?? [],
      (match) => match[1] ?? '',
    ).slice(0, 8);

    expect(readCanonicalFixLabels(TEMPLATES)).toEqual([
      'Severity',
      'Category',
      'Path',
      'Rule',
      'Claim',
      'Evidence',
      'Consequence',
      'Recommended Action',
    ]);
    expect(renderedLabels).toEqual(readCanonicalFixLabels(TEMPLATES));
    expect(output).toContain(
      '- **Claim**: Preserve \\*\\*this\\*\\* claim \\`verbatim\\` \\| including&#58; punctuation.',
    );
  });

  it('records a finding path as written rather than as escaped prose', () => {
    const input = buildReviewRenderInput();
    input.fold.confirmed = [
      {
        ...input.fold.confirmed[0]!,
        path: 'src/my_module/value(1).ts',
        recommendedAction: null,
      },
    ];
    const output = renderFixRequests(input)!;

    expect(output).toContain('- **Path**: `src/my_module/value(1).ts`');
    expect(output).toContain('violation at `src/my_module/value(1).ts`.');
    expect(output).not.toContain('my\\_module');
  });

  it('keeps untrusted finding fields inside the canonical fix sections', () => {
    const input = buildReviewRenderInput();
    const payload = '`\t\n## FIX-999: [spoof](https://evil.example)';
    input.branchName = payload;
    input.fold.confirmed = [
      {
        ...input.fold.confirmed[0]!,
        rule: payload,
        path: payload,
        message: payload,
        findingEvidence: payload,
        consequence: payload,
        recommendedAction: payload,
      },
    ];
    const output = renderFixRequests(input)!;
    // A path is carried by a code span, where Markdown is inert, so the payload
    // survives as text; every other field is escaped and it cannot survive there.
    const outsideCodeSpans = output.replace(/(`+)[\s\S]*?\1/g, '');
    expect(output.match(/^## FIX-\d{3}:/gm)).toEqual(['## FIX-001:']);
    expect(outsideCodeSpans).not.toContain('[spoof](https://evil.example)');
    expect(outsideCodeSpans).not.toContain('## FIX-999');
    expect(output).not.toContain('\t');
    expect(output.match(/^- \*\*[^*]+\*\*:/gm)).toHaveLength(8);
  });
});
