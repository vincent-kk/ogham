import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const packageRoot = resolve(import.meta.dirname, '..', '..');

function runCheck(script: string, args: string[]): number | null {
  return spawnSync(
    process.execPath,
    [join(packageRoot, 'scripts', script), ...args],
    {
      cwd: packageRoot,
      encoding: 'utf8',
    },
  ).status;
}

describe('bridge generated artifacts', () => {
  it('MCP check mode rejects stale output without rewriting it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cennad-mcp-check-'));
    const output = join(dir, 'mcp-server.cjs');
    writeFileSync(output, 'stale');
    try {
      expect(
        runCheck('buildMcpServer.mjs', ['--check', '--output', output]),
      ).toBe(1);
      expect(readFileSync(output, 'utf8')).toBe('stale');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('hook check mode rejects stale outputs without rewriting them', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cennad-hooks-check-'));
    const bundles = ['claude', 'codex'].flatMap((host) => {
      mkdirSync(join(dir, host));
      return ['injectStatic.mjs', 'injectDynamic.mjs'].map((name) =>
        join(dir, host, name),
      );
    });
    for (const bundle of bundles) writeFileSync(bundle, 'stale');
    try {
      expect(runCheck('buildHooks.mjs', ['--check', '--output-dir', dir])).toBe(
        1,
      );
      for (const bundle of bundles)
        expect(readFileSync(bundle, 'utf8')).toBe('stale');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
