import { afterEach, describe, expect, it } from 'vitest';

import {
  PROPERTY_RUNS_CAP,
  resolvePropertyRuns,
} from './helpers/resolvePropertyRuns.js';

const ORIGINAL = process.env.FILID_PROPERTY_RUNS;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.FILID_PROPERTY_RUNS;
  else process.env.FILID_PROPERTY_RUNS = ORIGINAL;
});

/**
 * Resolve the budget with the environment set to one value.
 * @param value What the environment says, or undefined for nothing.
 * @returns The resolved run count.
 */
function withEnvironment(value: string | undefined): number {
  if (value === undefined) delete process.env.FILID_PROPERTY_RUNS;
  else process.env.FILID_PROPERTY_RUNS = value;
  return resolvePropertyRuns(20);
}

describe('the model-based run budget takes one value from the environment', () => {
  it.for([
    ['nothing', undefined, 20],
    ['a count inside the cap', '50', 50],
    ['the cap itself', String(PROPERTY_RUNS_CAP), PROPERTY_RUNS_CAP],
    ['past the cap', String(PROPERTY_RUNS_CAP + 1), 20],
    ['zero', '0', 20],
    ['a number with a suffix', '50runs', 20],
    ['prose', 'many', 20],
    ['empty', '', 20],
  ] as const)('answers %s with the run count it should', ([, value, expected]) => {
    // A mistake at the keyboard must not silently shorten or extend a sweep.
    expect(withEnvironment(value)).toBe(expected);
  });
});
