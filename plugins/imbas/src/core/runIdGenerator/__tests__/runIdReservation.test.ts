import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateRunId } from '../runIdGenerator.js';

vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
}));

/** Isolated runs directory removed after each reservation check. */
let runsDir: string;

beforeEach(() => {
  runsDir = fs.mkdtempSync(join(tmpdir(), 'imbas-reserve-'));
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 5, 12));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  fs.rmSync(runsDir, { recursive: true, force: true });
});

describe('run ID reservation', () => {
  it('returns an ID only after reserving its directory', () => {
    const id = generateRunId(runsDir);
    expect(id).toBe('20261105-001');
    expect(fs.existsSync(join(runsDir, id))).toBe(true);
  });

  it('reserves different IDs without caller-created directories', () => {
    expect(generateRunId(runsDir)).toBe('20261105-001');
    expect(generateRunId(runsDir)).toBe('20261105-002');
  });

  it('reserves the numeric successor after 999', () => {
    fs.mkdirSync(join(runsDir, '20261105-999'));
    const id = generateRunId(runsDir);
    expect(id).toBe('20261105-1000');
    expect(fs.existsSync(join(runsDir, id))).toBe(true);
  });

  it('increments sequences without losing integer precision', () => {
    fs.mkdirSync(join(runsDir, '20261105-9007199254740992'));
    expect(generateRunId(runsDir)).toBe('20261105-9007199254740993');
  });

  it('retries each occupied candidate after a stale directory scan', () => {
    fs.mkdirSync(join(runsDir, '20261105-001'));
    fs.mkdirSync(join(runsDir, '20261105-002'));
    fs.writeFileSync(join(runsDir, '20261105-001', 'source.md'), 'keep');
    vi.spyOn(fs, 'readdirSync').mockImplementationOnce(() => []);

    expect(generateRunId(runsDir)).toBe('20261105-003');
    expect(
      fs.readFileSync(join(runsDir, '20261105-001', 'source.md'), 'utf8'),
    ).toBe('keep');
  });

  it('propagates a runs-directory creation failure', () => {
    const failure = Object.assign(new Error('runs directory denied'), {
      code: 'EACCES',
    });
    vi.spyOn(fs, 'mkdirSync').mockImplementationOnce(() => {
      throw failure;
    });
    expect(() => generateRunId(runsDir)).toThrow(failure);
  });

  it('propagates a directory scan failure', () => {
    const failure = Object.assign(new Error('scan denied'), { code: 'EACCES' });
    vi.spyOn(fs, 'readdirSync').mockImplementationOnce(() => {
      throw failure;
    });
    expect(() => generateRunId(runsDir)).toThrow(failure);
  });

  it('propagates reservation failures other than EEXIST', () => {
    const failure = Object.assign(new Error('reservation denied'), {
      code: 'EACCES',
    });
    vi.spyOn(fs, 'mkdirSync')
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw failure;
      });
    expect(() => generateRunId(runsDir)).toThrow(failure);
  });

  it('ignores malformed sequence suffixes when reserving the next ID', () => {
    for (const name of ['20261105-999oops', '20261105-abc', '20261105-01'])
      fs.mkdirSync(join(runsDir, name));
    expect(generateRunId(runsDir)).toBe('20261105-001');
  });
});
