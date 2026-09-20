import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Redirect the host state root so the user config layer resolves into a
// per-test-file tmp dir instead of the developer's real ~/.claude. Without
// this, a config stored in the real user layer would merge into every test
// that reads the effective config, and the suite would pass or fail depending
// on whose machine it ran on.
//
// HOME is deliberately left alone: these tests shell out to real git, which
// reads the user's git config from it.
process.env.CLAUDE_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'filid-state-'));

// Every git command these tests run — fixtures and product alike — inherits
// this config. `git commit` otherwise ends by spawning a detached
// `git maintenance run --auto` that outlives the awaited command and can write
// pack files into a temp repository while the test's cleanup deletes it.
const GIT_TEST_CONFIG: readonly (readonly [string, string])[] = [
  ['maintenance.auto', 'false'],
  ['gc.auto', '0'],
  ['gc.autoDetach', 'false'],
];
process.env.GIT_CONFIG_COUNT = String(GIT_TEST_CONFIG.length);
GIT_TEST_CONFIG.forEach(([key, value], index) => {
  process.env[`GIT_CONFIG_KEY_${index}`] = key;
  process.env[`GIT_CONFIG_VALUE_${index}`] = value;
});
