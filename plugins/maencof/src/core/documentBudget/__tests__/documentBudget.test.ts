import { expect, it } from 'vitest';

import { measureDocumentBudget } from '../index.js';

it('counts empty files and terminal newlines without phantom lines', () => {
  expect(measureDocumentBudget('').total_lines).toBe(0);
  expect(measureDocumentBudget('a\r\nb\r\n').total_lines).toBe(2);
});
it('warns strictly beyond 100 physical lines including frontmatter', () => {
  expect(measureDocumentBudget('a\n'.repeat(100)).exceeded).toBe(false);
  expect(measureDocumentBudget('a\r\n'.repeat(101)).reasons).toContain(
    'total_lines',
  );
});
it('counts code points and excludes only a complete opening frontmatter block', () => {
  expect(measureDocumentBudget('---\r\ntitle: a\r\n---\r\n😀').body_chars).toBe(
    1,
  );
  expect(measureDocumentBudget('😀'.repeat(6000)).exceeded).toBe(false);
  expect(measureDocumentBudget('😀'.repeat(6001)).reasons).toContain(
    'body_chars',
  );
  expect(measureDocumentBudget('---\nunfinished').body_chars).toBe(14);
  expect(measureDocumentBudget('---\n---\nText').body_chars).toBe(4);
});
