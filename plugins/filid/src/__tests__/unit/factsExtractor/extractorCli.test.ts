import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { portableRelative } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ecmascriptStructureAdapter } from '../../../adapters/ecmascript/index.js';
import type { FileFacts } from '../../../factsExtractor/index.js';

/** Package root; `node --import tsx` resolves from here. */
const PACKAGE_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
/** The program's entry source, run directly instead of the owner-built bundle. */
const ENTRY = join(PACKAGE_ROOT, 'src/factsExtractor/factsExtractor.entry.ts');

/** Longest one run may take; a run that blocks is killed and reports a null status. */
const RUN_TIMEOUT_MS = 20_000;

/** Temporary project the program reads. */
let root: string;
/** Directory outside the project that holds the output. */
let outside: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-facts-cli-'));
  outside = mkdtempSync(join(tmpdir(), 'filid-facts-out-'));
  writeFileSync(join(root, 'a.ts'), "import { b } from './b.js';\n");
  writeFileSync(join(root, 'b.ts'), 'export const b = 1;\n');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

/**
 * Run the entry source with tsx.
 * @param args Program arguments.
 * @param input Optional stdin text.
 * @param env Environment of the run; a test prepends a fake `git` to PATH.
 * @returns Exit status, stdout and stderr.
 */
function runProgram(
  args: string[],
  input = '',
  env: NodeJS.ProcessEnv = process.env,
) {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', ENTRY, ...args],
    {
      cwd: PACKAGE_ROOT,
      input,
      encoding: 'utf8',
      env,
      timeout: RUN_TIMEOUT_MS,
    },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

describe('filid-facts command line', () => {
  it('writes the records outside the tree and prints only a summary', () => {
    const out = join(outside, 'facts.json');
    const run = runProgram(
      ['--root', root, '--out', out, '--files-from', '-'],
      'b.ts\na.ts\n../escape.ts\n',
    );
    expect(run.status).toBe(0);
    const summary = JSON.parse(run.stdout.trim()) as Record<string, unknown>;
    expect(summary).toMatchObject({
      files: 2,
      toolErrors: 0,
      rejected: 1,
      output: out,
    });
    const records = JSON.parse(readFileSync(out, 'utf8')) as FileFacts[];
    expect(records.map(({ path }) => path)).toEqual(['a.ts', 'b.ts']);
    expect(records[0].provenance.command).toBe(
      'filid-facts --root . --out <outside> --files-from -',
    );
  }, 30_000);

  it('writes the same bytes for relative output paths in different directories', () => {
    const other = mkdtempSync(join(tmpdir(), 'filid-facts-out-'));
    try {
      const outputs = [outside, other].map((directory) => {
        const out = relative(PACKAGE_ROOT, join(directory, 'facts.json'));
        expect(runProgram(['--root', root, '--out', out, 'a.ts']).status).toBe(
          0,
        );
        return readFileSync(join(directory, 'facts.json'), 'utf8');
      });
      expect(outputs[0]).toContain('--out <outside>');
      expect(outputs[1]).toBe(outputs[0]);
    } finally {
      rmSync(other, { recursive: true, force: true });
    }
  }, 30_000);

  it('refuses an output path inside the project tree and a run without a list', () => {
    const inside = runProgram([
      '--root',
      root,
      '--out',
      join(root, 'facts.json'),
      'a.ts',
    ]);
    expect(inside.status).toBe(2);
    expect(inside.stderr).toContain('outside the project');
    expect(existsSync(join(root, 'facts.json'))).toBe(false);
    const noList = runProgram([
      '--root',
      root,
      '--out',
      join(outside, 'x.json'),
    ]);
    expect(noList.status).toBe(2);
    expect(existsSync(join(outside, 'x.json'))).toBe(false);
  }, 30_000);

  it.each([
    ['an --out that is an existing directory', 'out-dir', null],
    ['a --files-from file that does not exist', 'missing-list', null],
    ['a JSON list holding a non-string', 'list', '["a.ts", 1]'],
    ['a JSON list that does not parse', 'list', '["a.ts",'],
  ])(
    'refuses %s with one line and exit 2',
    (_label, shape, listText) => {
      const list = join(outside, 'list.json');
      if (listText !== null) writeFileSync(list, listText);
      const out = shape === 'out-dir' ? outside : join(outside, 'out.json');
      const run = runProgram(
        shape === 'out-dir'
          ? ['--root', root, '--out', out, 'a.ts']
          : [
              '--root',
              root,
              '--out',
              out,
              '--files-from',
              shape === 'missing-list' ? join(outside, 'none.txt') : list,
            ],
      );
      expect(run.status).toBe(2);
      expect(run.stderr.trim().split('\n')).toHaveLength(1);
      expect(run.stderr).toMatch(/^filid-facts: /);
      expect(run.stderr).not.toContain(PACKAGE_ROOT);
      expect(existsSync(join(outside, 'out.json'))).toBe(false);
    },
    30_000,
  );

  it.skipIf(process.platform === 'win32')(
    'refuses a --files-from that is not a regular file without opening it',
    () => {
      const fifo = join(outside, 'list.fifo');
      execFileSync('mkfifo', [fifo]);
      const out = join(outside, 'out.json');
      const run = runProgram([
        '--root',
        root,
        '--out',
        out,
        '--files-from',
        fifo,
      ]);
      expect(run.status).toBe(2);
      expect(run.stderr).toBe(
        `filid-facts: --files-from ${fifo} is not a regular file.\n`,
      );
      expect(existsSync(out)).toBe(false);
    },
    30_000,
  );

  it.skipIf(process.platform === 'win32')(
    'starts git only for --all, never for a file list',
    () => {
      const bin = mkdtempSync(join(tmpdir(), 'filid-facts-bin-'));
      const marker = join(bin, 'git-called');
      writeFileSync(
        join(bin, 'git'),
        `#!/bin/sh\necho called >> '${marker}'\nexit 1\n`,
      );
      chmodSync(join(bin, 'git'), 0o755);
      const env = { ...process.env, PATH: `${bin}:${process.env.PATH ?? ''}` };
      try {
        const listed = runProgram(
          ['--root', root, '--out', join(outside, 'list.json'), 'a.ts'],
          '',
          env,
        );
        expect(listed.status).toBe(0);
        expect(existsSync(marker)).toBe(false);
        const all = runProgram(
          ['--root', root, '--out', join(outside, 'all.json'), '--all'],
          '',
          env,
        );
        expect(all.status).toBe(0);
        expect(existsSync(marker)).toBe(true);
      } finally {
        rmSync(bin, { recursive: true, force: true });
      }
    },
    30_000,
  );

  it('extracts with --all exactly the files the adapter discovers', async () => {
    const out = join(outside, 'all.json');
    expect(runProgram(['--root', root, '--out', out, '--all']).status).toBe(0);
    const records = JSON.parse(readFileSync(out, 'utf8')) as FileFacts[];
    expect(records.map(({ path }) => path)).toEqual(
      (await ecmascriptStructureAdapter.discoverSourceFiles(root))
        .map((path) => portableRelative(root, path).replaceAll('\\', '/'))
        .sort(),
    );
  }, 30_000);
});
