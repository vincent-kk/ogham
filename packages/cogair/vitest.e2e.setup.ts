import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach } from 'vitest';

// Per-test-file HOME tmpdir so cogair's COGAIR_HOME (= `<home>/.claude/plugins/cogair`)
// stays isolated across e2e specs that mutate config / counter / sessions on disk.
process.env.HOME = mkdtempSync(join(tmpdir(), 'cogair-e2e-'));

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
