import { describe, expect, it } from 'vitest';

import { loadConfig } from '@/config/index.js';
import { evasionArgs } from '@/ytdlp/runner/evasion-args.js';

describe('loadConfig', () => {
  it('applies documented defaults', () => {
    const c = loadConfig({});
    expect(c.binary.cooldownDays).toBe(3);
    expect(c.binary.refreshDays).toBe(7);
    expect(c.extraction.maxConcurrency).toBe(1);
    expect(c.extraction.timeoutMs).toBe(90_000);
    expect(c.logLevel).toBe('info');
  });

  it('keeps opt-in tools off by default', () => {
    const c = loadConfig({});
    expect(c.enable.comments).toBe(false);
    expect(c.enable.downloadVideo).toBe(false);
    expect(c.enable.downloadAudio).toBe(false);
  });

  it('keeps core tools on by default but lets a flag disable them', () => {
    expect(loadConfig({}).enable.search).toBe(true);
    expect(loadConfig({}).enable.playlist).toBe(true);
    expect(loadConfig({ YTDLP_ENABLE_SEARCH: '0' }).enable.search).toBe(false);
  });

  it('honors individual enable flags', () => {
    const c = loadConfig({
      YTDLP_ENABLE_COMMENTS: '1',
      YTDLP_ENABLE_DOWNLOAD_VIDEO: 'true',
    });
    expect(c.enable.comments).toBe(true);
    expect(c.enable.downloadVideo).toBe(true);
    expect(c.enable.downloadAudio).toBe(false);
    expect(c.enable.heatmap).toBe(false);
  });

  it('YTDLP_ENABLE_ALL turns everything on', () => {
    const c = loadConfig({ YTDLP_ENABLE_ALL: '1' });
    expect(Object.values(c.enable).every(Boolean)).toBe(true);
  });

  it('throws on out-of-range numeric config', () => {
    expect(() => loadConfig({ YTDLP_MAX_CONCURRENCY: '99' })).toThrow(
      /configuration/i,
    );
    expect(() => loadConfig({ YTDLP_COOLDOWN_DAYS: '-1' })).toThrow(
      /configuration/i,
    );
  });

  it('defaults sub language to en and leaves lang unset', () => {
    const c = loadConfig({});
    expect(c.extraction.defaultSubLang).toBe('en');
    expect(c.lang).toBeUndefined();
  });

  it('reads YTDLP_DEFAULT_SUB_LANG and YTDLP_LANG independently', () => {
    const c = loadConfig({ YTDLP_DEFAULT_SUB_LANG: 'ko', YTDLP_LANG: 'ja' });
    expect(c.extraction.defaultSubLang).toBe('ko');
    expect(c.lang).toBe('ja');
  });

  it('falls back to YTDLP_LANG for the default sub language when YTDLP_DEFAULT_SUB_LANG is unset', () => {
    const c = loadConfig({ YTDLP_LANG: 'ko' });
    expect(c.extraction.defaultSubLang).toBe('ko');
    expect(c.lang).toBe('ko');
  });

  it('defaults playerClient to ios,tv,default', () => {
    expect(loadConfig({}).playerClient).toBe('ios,tv,default');
  });

  it('honors YTDLP_PLAYER_CLIENT override and treats a blank value as disabled', () => {
    expect(loadConfig({ YTDLP_PLAYER_CLIENT: 'tv' }).playerClient).toBe('tv');
    expect(
      loadConfig({ YTDLP_PLAYER_CLIENT: '  ' }).playerClient,
    ).toBeUndefined();
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
    expect(evasionArgs(c)).toEqual([
      '--cookies',
      '/tmp/c.txt',
      '--proxy',
      'socks5://127.0.0.1:1080',
    ]);
  });

  it('uses browser extraction when no file is set', () => {
    const c = loadConfig({ YTDLP_COOKIES_FROM_BROWSER: 'firefox' });
    expect(evasionArgs(c)).toEqual(['--cookies-from-browser', 'firefox']);
  });
});
