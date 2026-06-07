import { describe, expect, it } from 'vitest';

import { evasionArgs, loadConfig } from '../config.js';

describe('loadConfig', () => {
  it('applies documented defaults', () => {
    const c = loadConfig({});
    expect(c.binary.cooldownDays).toBe(7);
    expect(c.binary.refreshDays).toBe(14);
    expect(c.extraction.maxConcurrency).toBe(2);
    expect(c.extraction.timeoutMs).toBe(90_000);
    expect(c.logLevel).toBe('info');
  });

  it('keeps opt-in tools off by default', () => {
    const c = loadConfig({});
    expect(c.enable.comments).toBe(false);
    expect(c.enable.download).toBe(false);
  });

  it('honors individual enable flags', () => {
    const c = loadConfig({ YTDLP_ENABLE_COMMENTS: '1', YTDLP_ENABLE_DOWNLOAD: 'true' });
    expect(c.enable.comments).toBe(true);
    expect(c.enable.download).toBe(true);
    expect(c.enable.heatmap).toBe(false);
  });

  it('YTDLP_ENABLE_ALL turns everything on', () => {
    const c = loadConfig({ YTDLP_ENABLE_ALL: '1' });
    expect(Object.values(c.enable).every(Boolean)).toBe(true);
  });

  it('throws on out-of-range numeric config', () => {
    expect(() => loadConfig({ YTDLP_MAX_CONCURRENCY: '99' })).toThrow(/configuration/i);
    expect(() => loadConfig({ YTDLP_COOLDOWN_DAYS: '-1' })).toThrow(/configuration/i);
  });
});

describe('evasionArgs', () => {
  it('is empty by default', () => {
    expect(evasionArgs(loadConfig({}))).toEqual([]);
  });

  it('prefers cookie file over browser and includes proxy', () => {
    const c = loadConfig({
      YTDLP_COOKIES_FILE: '/tmp/c.txt',
      YTDLP_COOKIES_FROM_BROWSER: 'chrome',
      YTDLP_PROXY: 'socks5://127.0.0.1:1080',
    });
    expect(evasionArgs(c)).toEqual(['--cookies', '/tmp/c.txt', '--proxy', 'socks5://127.0.0.1:1080']);
  });

  it('uses browser extraction when no file is set', () => {
    const c = loadConfig({ YTDLP_COOKIES_FROM_BROWSER: 'firefox' });
    expect(evasionArgs(c)).toEqual(['--cookies-from-browser', 'firefox']);
  });
});
