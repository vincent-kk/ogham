import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadConfig } from '@/config/index.js';
import type { BinaryManager } from '@/ytdlp/binary/ensure-binary.js';
import { cookieArgs, proxyArg } from '@/ytdlp/runner/evasion-args.js';
import { createRunner } from '@/ytdlp/runner/runner.js';

import { silentLogger } from './helpers/test-context.js';

const execaMock = vi.hoisted(() =>
  vi.fn<
    (
      file: string,
      args: string[],
    ) => Promise<{ stdout: string; stderr: string }>
  >(async () => ({ stdout: '', stderr: '' })),
);
vi.mock('execa', () => ({ execa: execaMock }));

const fakeBinaryManager: BinaryManager = {
  ensureBinary: async () => '/fake/yt-dlp',
};

/** Reads the captured finalArgs from the n-th execa invocation. */
function argsOf(callIndex: number): string[] {
  return execaMock.mock.calls[callIndex]?.[1] as string[];
}

/** Extracts the `--proxy` value from a finalArgs array, or undefined. */
function proxyOf(args: string[]): string | undefined {
  const i = args.indexOf('--proxy');
  return i >= 0 ? args[i + 1] : undefined;
}

beforeEach(() => {
  execaMock.mockClear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('proxyArg / cookieArgs units', () => {
  it('proxyArg returns the flag when given, empty otherwise', () => {
    expect(proxyArg('socks5://h:1')).toEqual(['--proxy', 'socks5://h:1']);
    expect(proxyArg(undefined)).toEqual([]);
  });

  it('cookieArgs prefers cookie file over browser, empty by default', () => {
    expect(cookieArgs(loadConfig({}))).toEqual([]);
    const c = loadConfig({
      YTDLP_COOKIES_FILE: '/tmp/c.txt',
      YTDLP_COOKIES_FROM_BROWSER: 'chrome',
    });
    expect(cookieArgs(c)).toEqual(['--cookies', '/tmp/c.txt']);
  });
});

describe('runner proxy rotation', () => {
  it('round-robins a pool [A,B,C] and wraps on the 4th call', async () => {
    const config = loadConfig({ YTDLP_PROXY_POOL: 'A,B,C' });
    const runner = createRunner({
      binaryManager: fakeBinaryManager,
      config,
      logger: silentLogger,
      nodePath: '/node',
    });
    for (let i = 0; i < 4; i += 1) await runner.run(['--version']);
    expect([0, 1, 2, 3].map((i) => proxyOf(argsOf(i)))).toEqual([
      'A',
      'B',
      'C',
      'A',
    ]);
  });

  it('uses the single static proxy constantly when no pool is set', async () => {
    const config = loadConfig({ YTDLP_PROXY: 'P' });
    const runner = createRunner({
      binaryManager: fakeBinaryManager,
      config,
      logger: silentLogger,
      nodePath: '/node',
    });
    await runner.run(['a']);
    await runner.run(['b']);
    expect([0, 1].map((i) => proxyOf(argsOf(i)))).toEqual(['P', 'P']);
  });

  it('emits no --proxy when neither pool nor static proxy is configured', async () => {
    const config = loadConfig({});
    const runner = createRunner({
      binaryManager: fakeBinaryManager,
      config,
      logger: silentLogger,
      nodePath: '/node',
    });
    await runner.run(['x']);
    expect(argsOf(0)).not.toContain('--proxy');
  });

  it('keeps cookies in the invariant prefix while the proxy rotates (no dup cookies)', async () => {
    const config = loadConfig({
      YTDLP_COOKIES_FILE: '/tmp/c.txt',
      YTDLP_PROXY_POOL: 'A,B',
    });
    const runner = createRunner({
      binaryManager: fakeBinaryManager,
      config,
      logger: silentLogger,
      nodePath: '/node',
    });
    await runner.run(['a']);
    await runner.run(['b']);
    const first = argsOf(0);
    const second = argsOf(1);
    const cookieCount = (args: string[]): number =>
      args.filter((a) => a === '--cookies').length;
    expect(cookieCount(first)).toBe(1);
    expect(cookieCount(second)).toBe(1);
    expect(proxyOf(first)).toBe('A');
    expect(proxyOf(second)).toBe('B');
  });

  it('injects player_client once per call as part of the invariant prefix', async () => {
    const config = loadConfig({ YTDLP_PROXY_POOL: 'A,B' });
    const runner = createRunner({
      binaryManager: fakeBinaryManager,
      config,
      logger: silentLogger,
      nodePath: '/node',
    });
    await runner.run(['a']);
    await runner.run(['b']);
    const clientCount = (args: string[]): number =>
      args.filter((a) => a === 'youtube:player_client=ios,tv,default').length;
    expect(clientCount(argsOf(0))).toBe(1);
    expect(clientCount(argsOf(1))).toBe(1);
  });

  it('appends caller args after the rotated proxy', async () => {
    const config = loadConfig({ YTDLP_PROXY_POOL: 'A,B' });
    const runner = createRunner({
      binaryManager: fakeBinaryManager,
      config,
      logger: silentLogger,
      nodePath: '/node',
    });
    await runner.run(['--print', 'id']);
    const args = argsOf(0);
    const proxyIdx = args.indexOf('--proxy');
    expect(args.slice(proxyIdx)).toEqual(['--proxy', 'A', '--print', 'id']);
  });
});

describe('runner extractor-args merge', () => {
  it('merges player_client with a caller youtube arg into one --extractor-args', async () => {
    const config = loadConfig({});
    const runner = createRunner({
      binaryManager: fakeBinaryManager,
      config,
      logger: silentLogger,
      nodePath: '/node',
    });
    await runner.run([
      '--dump-single-json',
      '--extractor-args',
      'youtube:lang=ko',
      'URL',
    ]);
    const args = argsOf(0);
    expect(args.filter((a) => a === '--extractor-args')).toHaveLength(1);
    const idx = args.indexOf('--extractor-args');
    expect(args[idx + 1]).toBe('youtube:player_client=ios,tv,default;lang=ko');
  });
});
