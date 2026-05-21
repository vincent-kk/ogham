import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Redirect `homedir()` to a per-test-file tmp dir so cogair's COGAIR_HOME
// (= `<home>/.claude/plugins/cogair`) operates inside an isolated sandbox.
// Phase 1's `paths.test.ts` keeps passing because both sides of its
// assertion read `homedir()` after this override.
process.env.HOME = mkdtempSync(join(tmpdir(), 'cogair-test-'));
