import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readSealedReviewSummary } from '../../../../mcp/tools/reviewState/handlers/utils/readSealedReviewSummary.js';
import { renderReviewReport } from '../../../../mcp/tools/reviewState/render/renderReviewReport.js';

import { buildReviewRenderInput } from './helpers/buildReviewRenderInput.js';

describe('sealed summary portability', () => {
  it.each(['\n', '\r\n'])(
    'restores the same counts with %j line endings',
    (newline) => {
      const root = mkdtempSync(join(tmpdir(), 'filid-summary-'));
      try {
        const input = buildReviewRenderInput();
        const path = join(root, 'report.md');
        writeFileSync(path, renderReviewReport(input).replace(/\n/g, newline));
        expect(readSealedReviewSummary(path, 'REQUEST_CHANGES')).toMatchObject({
          filesTotal: 3,
          filesReviewed: 1,
          filesSkipped: 1,
          confirmed: 2,
          refuted: 1,
          indeterminate: 1,
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );
});
