import { beforeEach, describe, expect, it, vi } from 'vitest';

import { startServer } from '../lifecycle/startServer.js';

/** Startup boundary doubles preserve the real cross-platform package exports. */
const doubles = vi.hoisted(() => ({
  connect: vi.fn(),
  root: vi.fn(),
  sweep: vi.fn(),
}));

vi.mock('../lifecycle/createServer.js', () => ({
  createServer: () => ({ connect: doubles.connect }),
}));
vi.mock('../lifecycle/bootSweep.js', () => ({ bootSweep: doubles.sweep }));
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));
vi.mock('@ogham/cross-platform', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ogham/cross-platform')>()),
  tryProjectRoot: doubles.root,
}));

describe('startServer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    doubles.connect.mockResolvedValue(undefined);
    doubles.root.mockReturnValue('/repo');
  });

  it('resolves after connect without waiting for the scheduled cleanup', async () => {
    await startServer();
    expect(doubles.connect).toHaveBeenCalledOnce();
    expect(doubles.sweep).not.toHaveBeenCalled();
    await new Promise(setImmediate);
    expect(doubles.sweep).toHaveBeenCalledExactlyOnceWith(
      '/repo',
      expect.any(Number),
    );
  });

  it('does not schedule cleanup before the connection resolves', async () => {
    let finish!: () => void;
    doubles.connect.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const started = startServer();
    await new Promise(setImmediate);
    expect(doubles.root).not.toHaveBeenCalled();
    expect(doubles.sweep).not.toHaveBeenCalled();
    finish();
    await started;
    await new Promise(setImmediate);
    expect(doubles.sweep).toHaveBeenCalledOnce();
  });

  it('skips cleanup when the workspace is unknown', async () => {
    doubles.root.mockReturnValue(null);
    await startServer();
    await new Promise(setImmediate);
    expect(doubles.sweep).not.toHaveBeenCalled();
  });

  it('keeps startup successful when workspace resolution throws', async () => {
    doubles.root.mockImplementation(() => {
      throw new Error('no workspace');
    });
    await expect(startServer()).resolves.toBeUndefined();
    await new Promise(setImmediate);
    expect(doubles.sweep).not.toHaveBeenCalled();
  });

  it('preserves connection failures without starting cleanup', async () => {
    doubles.connect.mockRejectedValue(new Error('connect failed'));
    await expect(startServer()).rejects.toThrow('connect failed');
    await new Promise(setImmediate);
    expect(doubles.root).not.toHaveBeenCalled();
    expect(doubles.sweep).not.toHaveBeenCalled();
  });
});
