import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildSync } from 'esbuild';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const GUARDED_READ = new URL(
  '../../../core/facts/paths/readGuardedFileSync.ts',
  import.meta.url,
).pathname;

/**
 * Drive the guarded read from a footer appended to the bundle.
 *
 * Kept as source text rather than a second file so the probe cannot drift away
 * from the module it exercises.
 */
const PROBE = `
import { argv, stdout } from 'node:process';
const result = readGuardedFileSync(argv[2], Number(argv[3]));
stdout.write(result.ok ? 'ok' : result.reason);
`;

let directory: string;
let bundle: string;

beforeAll(() => {
  directory = mkdtempSync(join(realpathSync(tmpdir()), 'filid-guarded-read-'));
  bundle = join(directory, 'guarded-read.mjs');
  buildSync({
    entryPoints: [GUARDED_READ],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: bundle,
    footer: { js: PROBE },
  });
});

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

/**
 * Read one path through the guarded read, in a child process under a deadline.
 *
 * Out of process on purpose. A regression that drops `O_NONBLOCK` does not fail
 * this check, it BLOCKS it: `openSync` on a FIFO waits for a writer forever, and
 * a synchronous block cannot be interrupted by a test timeout — running it in
 * the test worker wedges the whole suite instead of reporting a failure. The
 * child turns that same regression into a fast, readable timeout, which is
 * exactly what the server-side defect looks like from outside.
 *
 * @param path - Absolute canonical path to read.
 * @param maxBytes - Size cap to apply.
 * @returns `ok` or the refusal reason the module produced.
 */
function guardedRead(path: string, maxBytes = 1024): string {
  return execFileSync(process.execPath, [bundle, path, String(maxBytes)], {
    encoding: 'utf8',
    timeout: 10_000,
  });
}

describe('readGuardedFileSync liveness', () => {
  // mkfifo is POSIX-only; Windows has no FIFO for this guard to refuse.
  it.skipIf(process.platform === 'win32')(
    'returns instead of blocking when the path is a FIFO',
    () => {
      const fifo = join(directory, 'blocking.fifo');
      execFileSync('mkfifo', [fifo]);

      expect(guardedRead(fifo)).toBe('not-regular');
    },
  );

  it('still reads a regular file in full', () => {
    const regular = join(directory, 'regular.json');
    writeFileSync(regular, '[]');

    expect(guardedRead(regular)).toBe('ok');
  });

  it('refuses a regular file over the cap', () => {
    const big = join(directory, 'big.json');
    writeFileSync(big, 'x'.repeat(64));

    expect(guardedRead(big, 8)).toBe('too-large');
  });
});
