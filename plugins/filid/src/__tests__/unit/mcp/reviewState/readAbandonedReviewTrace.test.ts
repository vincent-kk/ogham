import { mkdirSync, mkdtempSync, rmSync, utimesSync } from 'node:fs';

import { portableJoin, tmp, writeFileAtomicallySync } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  REVIEW_STATE_DIRECTORY_NAMES,
  REVIEW_STATE_FILE_NAMES,
} from '../../../../constants/reviewState.js';
import { readAbandonedReviewTrace } from '../../../../mcp/tools/reviewState/state/readAbandonedReviewTrace.js';

/** Branch-level review directory that owns the generation fixtures for one test. */
let branchDirectory: string;

beforeEach(() => {
  branchDirectory = mkdtempSync(
    portableJoin(tmp(), 'filid-review-abandoned-trace-'),
  );
});
afterEach(() => {
  rmSync(branchDirectory, { recursive: true, force: true });
});

/** Write a sealed report with the given verdict under one generation id. */
function writeGenerationReport(
  branchDirectory: string,
  generationId: string,
  verdict: string,
): string {
  const generationDirectory = portableJoin(
    branchDirectory,
    REVIEW_STATE_DIRECTORY_NAMES.GENERATIONS,
    generationId,
  );
  mkdirSync(generationDirectory, { recursive: true });
  const reportPath = portableJoin(
    generationDirectory,
    REVIEW_STATE_FILE_NAMES.REPORT,
  );
  writeFileAtomicallySync(reportPath, `---\nverdict: ${verdict}\n---\n`);
  return reportPath;
}

describe('readAbandonedReviewTrace', () => {
  it('reports the verdict of the most recently modified report, not directory walk order', () => {
    const olderReport = writeGenerationReport(
      branchDirectory,
      'gen-a-first-in-directory-order',
      'APPROVED',
    );
    const newerReport = writeGenerationReport(
      branchDirectory,
      'gen-b-last-in-directory-order',
      'REQUEST_CHANGES',
    );
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 60_000);
    utimesSync(olderReport, past, past);
    utimesSync(newerReport, future, future);

    expect(readAbandonedReviewTrace(branchDirectory)).toEqual({
      abandoned: true,
      priorVerdict: 'REQUEST_CHANGES',
    });
  });
});
