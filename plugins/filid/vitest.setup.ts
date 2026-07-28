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
