import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FACTS_EPOCH_DRIFT_LIMIT } from '../../../constants/facts.js';
import { recordEpochDrift } from '../../../core/facts/index.js';

let directory: string;
let path: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'filid-drift-'));
  path = join(directory, 'epoch-drift.json');
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

/**
 * How many epochs the counter file currently holds.
 * @returns The stored sequence length, or 0 when no file exists.
 */
function storedLength(): number {
  try {
    return (JSON.parse(readFileSync(path, 'utf8')) as { epochs: string[] })
      .epochs.length;
  } catch {
    return 0;
  }
}

describe('recordEpochDrift', () => {
  it('does not count the first refusal, which only sets the baseline', () => {
    expect(recordEpochDrift(path, 'sha256:a')).toEqual({
      consecutive: 0,
      unstable: false,
    });
  });

  it('counts each later epoch that differs from the last one seen', () => {
    recordEpochDrift(path, 'sha256:a');

    expect(recordEpochDrift(path, 'sha256:b').consecutive).toBe(1);
    expect(recordEpochDrift(path, 'sha256:c').consecutive).toBe(2);
  });

  it('reports unstable once the tree has moved the limit number of times', () => {
    const epochs = ['a', 'b', 'c', 'd', 'e'].map((name) => `sha256:${name}`);
    const verdicts = epochs.map((epoch) => recordEpochDrift(path, epoch));

    expect(verdicts.map((verdict) => verdict.unstable)).toEqual([
      false,
      false,
      false,
      true,
      true,
    ]);
    expect(FACTS_EPOCH_DRIFT_LIMIT).toBe(3);
  });

  it('ignores a repeat of the epoch already recorded', () => {
    recordEpochDrift(path, 'sha256:a');

    for (let attempt = 0; attempt < 10; attempt += 1)
      expect(recordEpochDrift(path, 'sha256:a').consecutive).toBe(0);
  });

  it('caps the stored sequence instead of growing it without bound', () => {
    for (let index = 0; index < 50; index += 1)
      recordEpochDrift(path, `sha256:${index}`);

    expect(storedLength()).toBeLessThanOrEqual(FACTS_EPOCH_DRIFT_LIMIT + 1);
  });

  it('clears the sequence when a submit lands', () => {
    for (const name of ['a', 'b', 'c', 'd'])
      recordEpochDrift(path, `sha256:${name}`);
    expect(recordEpochDrift(path, 'sha256:e').unstable).toBe(true);

    expect(recordEpochDrift(path, null)).toEqual({
      consecutive: 0,
      unstable: false,
    });
    expect(storedLength()).toBe(0);
    expect(recordEpochDrift(path, 'sha256:f').unstable).toBe(false);
  });
});
