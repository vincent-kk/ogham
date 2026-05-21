import { readFile, rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  COGAIR_HOME,
  SETTINGS_SERVER_PATH,
} from '../../../../constants/paths.js';
import { handleOpenSettings } from '../openSettings.js';

async function closeViaHttp(url: string): Promise<void> {
  try {
    await fetch(url.replace('/?', '/close?'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  } catch {
    // Already closing — fine.
  }
  await new Promise((r) => setTimeout(r, 80));
}

describe('handleOpenSettings', () => {
  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    try {
      const text = await readFile(SETTINGS_SERVER_PATH, 'utf8');
      const state = JSON.parse(text) as { url?: string };
      if (typeof state.url === 'string') await closeViaHttp(state.url);
    } catch {
      // No state file — nothing to clean.
    }
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  it('manages the singleton lifecycle: start, reuse, close, restart', async () => {
    const first = await handleOpenSettings({});
    expect(first.reused).toBe(false);
    expect(first.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/\?token=/);

    const second = await handleOpenSettings({});
    expect(second.reused).toBe(true);
    expect(second.url).toBe(first.url);

    const stateText = await readFile(SETTINGS_SERVER_PATH, 'utf8');
    const state = JSON.parse(stateText) as {
      url: string;
      pid: number;
      token: string;
      port: number;
    };
    expect(state.url).toBe(first.url);
    expect(state.pid).toBe(process.pid);
    expect(state.token).toHaveLength(32);
    expect(state.port).toBeGreaterThan(0);

    await closeViaHttp(first.url);
    await expect(readFile(SETTINGS_SERVER_PATH, 'utf8')).rejects.toThrow();

    const third = await handleOpenSettings({});
    expect(third.reused).toBe(false);

    await closeViaHttp(third.url);
  });
});
