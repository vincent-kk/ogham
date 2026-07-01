import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach } from 'vitest';

// Per-test-file HOME tmpdir so cennad's CENNAD_HOME (= `<home>/.claude/plugins/cennad`)
// stays isolated across e2e specs that mutate config / counter / sessions on disk.
// `os.homedir()` reads HOME on POSIX but USERPROFILE on Windows, so set both.
const e2eHome = mkdtempSync(join(tmpdir(), 'cennad-e2e-'));
process.env.HOME = e2eHome;
process.env.USERPROFILE = e2eHome;

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
