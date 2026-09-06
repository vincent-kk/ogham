import { afterEach, describe, expect, it, vi } from 'vitest';

const { start, openBrowser } = vi.hoisted(() => ({
  start: vi.fn(),
  openBrowser: vi.fn(),
}));
vi.mock('../webServer/index.js', () => ({ startSettingsServer: start }));
vi.mock('../utils/loadSettingsHtml.js', () => ({
  loadSettingsHtml: () => '<html></html>',
}));
vi.mock('@ogham/cross-platform', () => ({
  projectRoot: (path: string) => path,
  openBrowser,
}));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('settings startup ownership', () => {
  it('shares one in-flight startup for simultaneous calls', async () => {
    const { handleOpenSettings } = await import('../openSettings.js');
    let release!: (value: object) => void;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    start.mockImplementation(() => pending);
    const first = handleOpenSettings({ path: '/project' });
    const second = handleOpenSettings({ path: '/project' });
    release({
      url: 'http://127.0.0.1:1/?token=x',
      awaitSettled: async () => ({ kind: 'pending' }),
      close: async () => {},
    });
    const outputs = await Promise.all([first, second]);
    expect(start).toHaveBeenCalledTimes(1);
    expect(openBrowser).toHaveBeenCalledTimes(1);
    expect(outputs[0]!.url).toBe(outputs[1]!.url);
  });

  it('allows retry after a failed startup', async () => {
    const { handleOpenSettings } = await import('../openSettings.js');
    start.mockRejectedValueOnce(new Error('listen failed'));
    await expect(handleOpenSettings({ path: '/project' })).rejects.toThrow(
      'listen failed',
    );
    start.mockResolvedValueOnce({
      url: 'http://127.0.0.1:1/?token=x',
      awaitSettled: async () => ({ kind: 'pending' }),
      close: async () => {},
    });
    await expect(
      handleOpenSettings({ path: '/project' }),
    ).resolves.toMatchObject({ status: 'pending' });
    expect(start).toHaveBeenCalledTimes(2);
  });

  it('keeps a replacement server when an older close callback fires again', async () => {
    const { handleOpenSettings } = await import('../openSettings.js');
    const callbacks: Array<() => void> = [];
    start.mockImplementation(async ({ onClose }) => {
      callbacks.push(onClose);
      return {
        url: `http://127.0.0.1:${callbacks.length}/?token=x`,
        awaitSettled: async () => ({ kind: 'pending' }),
        close: async () => onClose(),
      };
    });
    await handleOpenSettings({ path: '/first-project' });
    const replacement = await handleOpenSettings({ path: '/second-project' });
    callbacks[0]!();
    const resumed = await handleOpenSettings({ path: '/second-project' });
    expect(resumed.url).toBe(replacement.url);
    expect(start).toHaveBeenCalledTimes(2);
  });
});
