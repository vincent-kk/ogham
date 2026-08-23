import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  '..',
);
const buildScript = join(packageRoot, 'scripts', 'buildSettingsHtml.mjs');

describe('settings page generated artifact', () => {
  it('check mode rejects a stale output without rewriting it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cennad-settings-check-'));
    const output = join(dir, 'settings.html');
    writeFileSync(output, 'stale');
    try {
      const result = spawnSync(
        process.execPath,
        [buildScript, '--check', '--output', output],
        { cwd: packageRoot, encoding: 'utf8' },
      );
      expect(result.status).toBe(1);
      expect(readFileSync(output, 'utf8')).toBe('stale');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
