import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach } from 'vitest';

// Per-test-file HOME tmpdir so cogair's COGAIR_HOME (= `<home>/.claude/plugins/cogair`)
// stays isolated across e2e specs that mutate config / counter / sessions on disk.
process.env.HOME = mkdtempSync(join(tmpdir(), 'cogair-e2e-'));

// open_settings normally launches the user's default browser. e2e iterations
// would spam the desktop, so suppress it for the whole test run.
process.env.COGAIR_DISABLE_BROWSER = '1';

const E2E_FAKE_ENV_PREFIXES = ['COGAIR_FAKE_'] as const;

function clearFakeEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (E2E_FAKE_ENV_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      delete process.env[key];
    }
  }
}

beforeEach(() => {
  clearFakeEnv();
});

afterEach(() => {
  clearFakeEnv();
});
