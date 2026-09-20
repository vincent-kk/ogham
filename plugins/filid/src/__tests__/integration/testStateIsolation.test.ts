import { homedir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveFactsStorePaths } from '../../core/facts/index.js';

import { testRunRoot } from './helpers/testRunRoot.js';

/**
 * The facts store and every cache resolve under `CLAUDE_CONFIG_DIR`, and most
 * test files never set it: they inherit what `vitest.setup.ts` put there. If
 * that redirect were removed or pointed anywhere else, those files would write
 * into the developer's real state directory and nothing would say so — the
 * tests would pass, having polluted the machine they ran on.
 */
describe('a test run writes its state under its own temporary root', () => {
  it('points CLAUDE_CONFIG_DIR inside the run root, away from the real one', () => {
    const configDir = process.env.CLAUDE_CONFIG_DIR;
    const runRoot = testRunRoot();

    expect(configDir).toBeDefined();
    expect(runRoot).toBeDefined();
    expect(resolve(configDir as string).startsWith(resolve(runRoot as string)))
      .toBe(true);
    expect(resolve(configDir as string)).not.toBe(
      resolve(homedir(), '.claude'),
    );
  });

  it('resolves a facts store path under that same root', () => {
    const { directory } = resolveFactsStorePaths(resolve('/project'));

    expect(
      resolve(directory).startsWith(resolve(testRunRoot() as string)),
    ).toBe(true);
  });
});
