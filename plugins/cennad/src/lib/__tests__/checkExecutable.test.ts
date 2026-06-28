import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkExecutable } from '../checkExecutable.js';

const { resultRef, spawnCli } = vi.hoisted(() => ({
  resultRef: {
    value: {
      code: 0 as number | null,
      stdout: 'v22.0.0\n',
      stderr: '',
      spawnError: null as NodeJS.ErrnoException | null,
      timedOut: false,
      abortedByCaller: false,
    },
  },
  spawnCli: vi.fn(),
}));

vi.mock('@ogham/cross-platform', () => ({
  spawnCli: (...args: unknown[]) => {
    spawnCli(...args);
    return Promise.resolve(resultRef.value);
  },
}));

describe('checkExecutable', () => {
  beforeEach(() => {
    resultRef.value = {
      code: 0,
      stdout: 'v22.0.0\n',
      stderr: '',
      spawnError: null,
      timedOut: false,
      abortedByCaller: false,
    };
    spawnCli.mockClear();
  });

  it('reports a successful version probe as available', async () => {
    await expect(checkExecutable('node')).resolves.toEqual({
      status: 'available',
      available: true,
      version: 'v22.0.0',
    });
    expect(spawnCli).toHaveBeenCalledWith('node', ['--version'], {
      timeoutMs: 5000,
    });
  });

  it('reports ENOENT as unavailable', async () => {
    const error = new Error('not found') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    resultRef.value = { ...resultRef.value, code: null, spawnError: error };

    await expect(checkExecutable('missing')).resolves.toEqual({
      status: 'unavailable',
      available: false,
    });
  });

  it('reports a timeout as unknown rather than unavailable', async () => {
    resultRef.value = { ...resultRef.value, code: null, timedOut: true };

    await expect(checkExecutable('slow')).resolves.toEqual({
      status: 'unknown',
      available: false,
    });
  });

  it('reports non-ENOENT spawn errors and non-zero exits as unknown', async () => {
    const error = new Error('busy') as NodeJS.ErrnoException;
    error.code = 'EAGAIN';
    resultRef.value = { ...resultRef.value, code: null, spawnError: error };
    await expect(checkExecutable('busy')).resolves.toMatchObject({
      status: 'unknown',
    });

    resultRef.value = { ...resultRef.value, code: 1, spawnError: null };
    await expect(checkExecutable('broken')).resolves.toMatchObject({
      status: 'unknown',
    });
  });
});
