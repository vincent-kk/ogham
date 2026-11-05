import { describe, expect, it } from 'vitest';

import { loadConfig } from '../config.js';

describe('loadConfig environment validation', () => {
  it('rejects an unrecognized global boolean instead of disabling it', () => {
    expect(() => loadConfig({ YTDLP_ENABLE_ALL: 'maybe' })).toThrow(
      /configuration/i,
    );
    expect(() => loadConfig({ YTDLP_ENABLE_ALL: 'maybe' })).toThrow(
      /YTDLP_ENABLE_ALL/,
    );
  });

  it('rejects an unrecognized boolean for a default-on tool', () => {
    expect(() => loadConfig({ YTDLP_ENABLE_SEARCH: 'tru' })).toThrow(
      /configuration/i,
    );
    expect(() => loadConfig({ YTDLP_ENABLE_SEARCH: 'tru' })).toThrow(
      /YTDLP_ENABLE_SEARCH/,
    );
  });

  it('rejects an unrecognized boolean for an opt-in tool', () => {
    expect(() => loadConfig({ YTDLP_ENABLE_COMMENTS: '2' })).toThrow(
      /configuration/i,
    );
  });

  it('validates individual flags even when all tools are enabled', () => {
    expect(() =>
      loadConfig({ YTDLP_ENABLE_ALL: '1', YTDLP_ENABLE_SEARCH: 'tru' }),
    ).toThrow(/configuration/i);
  });

  it('rejects nonnumeric values for every integer environment variable', () => {
    for (const key of [
      'YTDLP_COOLDOWN_DAYS',
      'YTDLP_REFRESH_DAYS',
      'YTDLP_MAX_CONCURRENCY',
      'YTDLP_TIMEOUT_MS',
      'YTDLP_CHARACTER_LIMIT',
      'YTDLP_MAX_TRANSCRIPT_LENGTH',
      'YTDLP_REQUEST_INTERVAL_MS',
      'YTDLP_SUBTITLE_INTERVAL_MS',
    ]) {
      expect(() => loadConfig({ [key]: 'invalid' }), key).toThrow(
        /configuration/i,
      );
    }
  });

  it('rejects partial decimal integers instead of accepting their prefix', () => {
    for (const value of ['3days', '3.5', '3e2', '0x10', '3 4']) {
      expect(() => loadConfig({ YTDLP_COOLDOWN_DAYS: value }), value).toThrow(
        /configuration/i,
      );
    }
  });

  it('keeps defaults for absent and blank numeric and boolean inputs', () => {
    for (const value of [undefined, '', '  ']) {
      const config = loadConfig({
        YTDLP_ENABLE_ALL: value,
        YTDLP_ENABLE_SEARCH: value,
        YTDLP_ENABLE_COMMENTS: value,
        YTDLP_COOLDOWN_DAYS: value,
      });
      expect(config.enable.search).toBe(true);
      expect(config.enable.comments).toBe(false);
      expect(config.binary.cooldownDays).toBe(3);
    }
  });

  it('accepts every documented true spelling', () => {
    for (const value of ['1', 'true', 'yes', 'on']) {
      expect(loadConfig({ YTDLP_ENABLE_COMMENTS: value }).enable.comments).toBe(
        true,
      );
      expect(
        Object.values(loadConfig({ YTDLP_ENABLE_ALL: value }).enable).every(
          Boolean,
        ),
      ).toBe(true);
    }
  });

  it('accepts every documented false spelling', () => {
    for (const value of ['0', 'false', 'no', 'off']) {
      const config = loadConfig({
        YTDLP_ENABLE_ALL: value,
        YTDLP_ENABLE_SEARCH: value,
        YTDLP_ENABLE_COMMENTS: 'true',
      });
      expect(config.enable.search).toBe(false);
      expect(config.enable.comments).toBe(true);
    }
  });

  it('preserves case-insensitive boolean parsing and surrounding whitespace', () => {
    const config = loadConfig({
      YTDLP_ENABLE_SEARCH: ' OFF ',
      YTDLP_ENABLE_COMMENTS: ' YeS ',
      YTDLP_COOLDOWN_DAYS: ' 4 ',
    });
    expect(config.enable.search).toBe(false);
    expect(config.enable.comments).toBe(true);
    expect(config.binary.cooldownDays).toBe(4);
  });

  it('preserves complete signed decimal integers and leading zeros', () => {
    for (const value of ['+03', '003']) {
      expect(
        loadConfig({ YTDLP_COOLDOWN_DAYS: value }).binary.cooldownDays,
      ).toBe(3);
    }
    expect(
      loadConfig({ YTDLP_REQUEST_INTERVAL_MS: '-0' }).extraction
        .requestIntervalMs,
    ).toBe(-0);
  });

  it('lets enable-all override valid false flags', () => {
    const config = loadConfig({
      YTDLP_ENABLE_ALL: 'true',
      YTDLP_ENABLE_SEARCH: 'false',
      YTDLP_ENABLE_COMMENTS: 'off',
    });
    expect(config.enable.search).toBe(true);
    expect(config.enable.comments).toBe(true);
  });

  it('retains schema rejection for out-of-range and overflowing integers', () => {
    for (const value of ['-1', '9'.repeat(400)]) {
      expect(() => loadConfig({ YTDLP_COOLDOWN_DAYS: value })).toThrow(
        /configuration/i,
      );
    }
  });
});
