import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach } from 'vitest';

// Per-test-file HOME tmpdir so cennad's CENNAD_HOME (= `<home>/.claude/plugins/cennad`)
// stays isolated across e2e specs that mutate config / counter / sessions on disk.
// `os.homedir()` reads HOME on POSIX but USERPROFILE on Windows, so set both.
const originalHome = process.env.HOME;
const originalUserProfile = process.env.USERPROFILE;
const e2eHome = mkdtempSync(join(tmpdir(), 'cennad-e2e-'));
process.env.HOME = e2eHome;
process.env.USERPROFILE = e2eHome;

// Real-CLI specs need the actual HOME to reach ~/.codex, ~/.gemini, ~/.claude auth
// files. Stash it so they can hand it to the child server while cennad's own data
// stays isolated via CENNAD_CONFIG_PATH.
if (originalHome !== undefined) process.env.CENNAD_E2E_REAL_HOME = originalHome;
if (originalUserProfile !== undefined)
  process.env.CENNAD_E2E_REAL_USERPROFILE = originalUserProfile;

const E2E_FAKE_ENV_PREFIXES = ['CENNAD_FAKE_'] as const;

function clearFakeEnv(): void {
  for (const key of Object.keys(process.env))
    if (E2E_FAKE_ENV_PREFIXES.some((prefix) => key.startsWith(prefix)))
      delete process.env[key];
}

beforeEach(() => {
  clearFakeEnv();
});

afterEach(() => {
  clearFakeEnv();
});
