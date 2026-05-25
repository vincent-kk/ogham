import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const here = fileURLToPath(import.meta.url);
const packageRoot = resolve(here, '../../../..');
const bridgeDir = resolve(packageRoot, 'bridge');

describe('hook bundle smoke tests', () => {
  let cwd: string;

  beforeAll(() => {
    cwd = mkdtempSync(join(tmpdir(), 'maencof-lens-hook-smoke-'));
  });

  afterAll(() => {
    if (cwd) rmSync(cwd, { recursive: true, force: true });
  });

  const bundle = resolve(bridgeDir, 'session-start.mjs');

  it.skipIf(!existsSync(bundle))(
    'session-start.mjs spawns, exits 0, stdout is empty or valid JSON, stderr clean',
    () => {
      const result = spawnSync(process.execPath, [bundle], {
        cwd,
        encoding: 'utf8',
        timeout: 10_000,
        windowsHide: true,
      });

      expect(result.status).toBe(0);
      // Hook stays silent when no lens config is present (no additionalContext).
      // When present, stdout MUST be a valid JSON envelope with
      // hookSpecificOutput.additionalContext as a string.
      if (result.stdout.trim().length > 0) {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toHaveProperty('hookSpecificOutput');
        expect(parsed.hookSpecificOutput.hookEventName).toBe('SessionStart');
        expect(typeof parsed.hookSpecificOutput.additionalContext).toBe(
          'string',
        );
      }
      expect(result.stderr).not.toMatch(
        /Dynamic require|Cannot find module|^Error:/m,
      );
    },
  );
});
