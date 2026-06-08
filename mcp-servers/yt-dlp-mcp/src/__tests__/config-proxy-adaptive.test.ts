import { describe, expect, it } from 'vitest';

import { loadConfig } from '../config/index.js';

describe('loadConfig adaptive proxy rate-limit defaults', () => {
  it('parses a pool, sizing concurrency to its length and relaxing intervals', () => {
    const c = loadConfig({ YTDLP_PROXY_POOL: 'a,b,c' });
    expect(c.evasion.proxyPool).toEqual(['a', 'b', 'c']);
    expect(c.extraction.maxConcurrency).toBe(3);
    expect(c.extraction.requestIntervalMs).toBe(0);
    expect(c.extraction.subtitleIntervalMs).toBe(250);
  });

  it('caps pool-derived concurrency at 8', () => {
    const pool = Array.from({ length: 12 }, (_, i) => `p${i}`).join(',');
    const c = loadConfig({ YTDLP_PROXY_POOL: pool });
    expect(c.evasion.proxyPool).toHaveLength(12);
    expect(c.extraction.maxConcurrency).toBe(8);
  });

  it('uses moderate defaults for a single static proxy', () => {
    const c = loadConfig({ YTDLP_PROXY: 'socks5://h:1' });
    expect(c.evasion.proxyPool).toEqual([]);
    expect(c.extraction.maxConcurrency).toBe(2);
    expect(c.extraction.requestIntervalMs).toBe(750);
    expect(c.extraction.subtitleIntervalMs).toBe(2000);
  });

  it('uses the strictest defaults when no proxy is configured', () => {
    const c = loadConfig({});
    expect(c.extraction.maxConcurrency).toBe(1);
    expect(c.extraction.requestIntervalMs).toBe(1500);
    expect(c.extraction.subtitleIntervalMs).toBe(4000);
  });

  it('lets an explicit YTDLP_MAX_CONCURRENCY override the pool-derived default', () => {
    const c = loadConfig({
      YTDLP_PROXY_POOL: 'a,b,c',
      YTDLP_MAX_CONCURRENCY: '5',
    });
    expect(c.extraction.maxConcurrency).toBe(5);
  });

  it('lets explicit interval env vars override adaptive no-proxy defaults', () => {
    const c = loadConfig({
      YTDLP_REQUEST_INTERVAL_MS: '0',
      YTDLP_SUBTITLE_INTERVAL_MS: '0',
    });
    expect(c.extraction.requestIntervalMs).toBe(0);
    expect(c.extraction.subtitleIntervalMs).toBe(0);
  });

  it('trims and drops empty entries when splitting the pool', () => {
    const c = loadConfig({ YTDLP_PROXY_POOL: 'a, ,b,' });
    expect(c.evasion.proxyPool).toEqual(['a', 'b']);
    expect(c.extraction.maxConcurrency).toBe(2);
  });

  it('treats a single-entry pool as pool mode (concurrency 1, relaxed intervals)', () => {
    const c = loadConfig({ YTDLP_PROXY_POOL: 'only' });
    expect(c.evasion.proxyPool).toEqual(['only']);
    expect(c.extraction.maxConcurrency).toBe(1);
    expect(c.extraction.subtitleIntervalMs).toBe(250);
  });
});
