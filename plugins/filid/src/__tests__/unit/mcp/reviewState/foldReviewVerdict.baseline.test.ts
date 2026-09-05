import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { portableJoin } from '@ogham/cross-platform';
import { describe, expect, it } from 'vitest';

import { foldReviewVerdict } from '../../../../mcp/tools/reviewState/verdict/foldReviewVerdict.js';

import { loadBaselineFoldInput } from './helpers/loadBaselineFoldInput.js';
import { readBaselineExpectedSets } from './helpers/readBaselineExpectedSets.js';

/** Preserved repository fixture root; no seal effects or live reviews run here. */
const BASELINE_ROOT = fileURLToPath(
  new URL(
    '../../../../../../../.metadata/filid/cross-review-calibration/baseline-v7/',
    import.meta.url,
  ),
);

describe('foldReviewVerdict baseline replay', () => {
  it.each(['a', 'b', 'c', 'd', 'f', 'g', 'h'])(
    'preserves verdict and both ID sets for run %s',
    (run) => {
      const directory = portableJoin(BASELINE_ROOT, run);
      const input = loadBaselineFoldInput(directory);
      const expected = readBaselineExpectedSets(
        readFileSync(portableJoin(directory, 'review-report.md'), 'utf8'),
      );
      const before = JSON.stringify(input);
      const result = foldReviewVerdict(input);
      expect(result.verdict).toBe(expected.verdict);
      expect(new Set(result.confirmed.map(({ id }) => id))).toEqual(
        expected.confirmedIds,
      );
      expect(new Set(result.decisions.map(({ id }) => id))).toEqual(
        expected.verificationIds,
      );
      expect(JSON.stringify(input)).toBe(before);
      if (run === 'f') {
        expect(input.evidence.evidenceComplete).toBe(false);
        expect(result.verdict).toBe('INCONCLUSIVE');
      }
    },
  );
});
