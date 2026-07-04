import { describe, expect, it } from 'vitest';

import { L1_EXCERPT_MAX_CHARS } from '../../../constants/performance.js';
import { compressMarkdownBody } from '../compressMarkdown.js';

const TRUNCATION_MARKER = '… (truncated)';

describe('compressMarkdownBody', () => {
  it('strips frontmatter and every heading line, flattening the whole body', () => {
    const doc = [
      '---',
      'title: X',
      '---',
      '# Title',
      '',
      '## Section',
      '',
      'line one',
      'line two',
      '',
      '## Tail',
      '',
      'line three',
    ].join('\n');
    // Old version stopped at the first paragraph (line one/two); regression-locks body retention past blank lines.
    expect(compressMarkdownBody(doc)).toBe('line one line two line three');
  });

  it('returns short bodies intact without a marker', () => {
    expect(compressMarkdownBody('short body', 150)).toBe('short body');
  });

  it('caps over-limit bodies at maxChars including the truncation marker', () => {
    const out = compressMarkdownBody('a'.repeat(200), 150);
    expect(out).toHaveLength(150);
    expect(out.endsWith(TRUNCATION_MARKER)).toBe(true);
    expect(out.startsWith('a'.repeat(150 - TRUNCATION_MARKER.length))).toBe(
      true,
    );
  });

  it('does not leave a dangling surrogate half when the cut lands inside an emoji', () => {
    const doc = `${'x'.repeat(136)}😀${'y'.repeat(50)}`;
    const out = compressMarkdownBody(doc, 150);
    expect(out).toBe(`${'x'.repeat(136)}${TRUNCATION_MARKER}`);
    expect(out).not.toMatch(/[\uD800-\uDFFF]/);
  });

  it('strips headings indented up to three spaces but keeps four-space-indented lines', () => {
    const doc = [
      '   # Indented Heading',
      'body line',
      '    # four spaces is a code block, not a heading',
    ].join('\n');
    expect(compressMarkdownBody(doc)).toBe(
      'body line # four spaces is a code block, not a heading',
    );
  });

  it('falls back to a bare ellipsis when maxChars is smaller than the full marker', () => {
    const out = compressMarkdownBody('a'.repeat(50), 5);
    expect(out).toBe('aaaa…');
    expect(out).toHaveLength(5);
  });

  it('returns an empty string for non-positive maxChars', () => {
    expect(compressMarkdownBody('anything', 0)).toBe('');
  });

  it('keeps an over-150-char L1 identity document intact at the L1 excerpt limit', () => {
    const doc = [
      '---',
      'layer: 1',
      'title: Identity',
      '---',
      '# Identity',
      '',
      '- **Name**: Vincent Kelvin',
      '- **Occupation**: Software Engineer',
      '- **Role**: technical review, hands-on development, operations',
      '- **Main interests**: AI-driven web/app/server development, AI infrastructure, LLM research',
      '- **Long-term goal**: deepening AI technical expertise',
      '- **Learning style**: theory- and structure-oriented',
      '- **Decision criteria**: data/evidence-based with practicality and ROI focus',
      '- **Daily routine**: defined and discovered through use',
    ].join('\n');
    const out = compressMarkdownBody(doc, L1_EXCERPT_MAX_CHARS);
    expect(out).toContain(
      '**Long-term goal**: deepening AI technical expertise',
    );
    expect(out).toContain(
      '**Daily routine**: defined and discovered through use',
    );
    expect(out).not.toContain(TRUNCATION_MARKER);
  });
});
