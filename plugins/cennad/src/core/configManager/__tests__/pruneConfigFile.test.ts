import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { CENNAD_HOME, CONFIG_PATH } from '../../../constants/paths.js';
import { pruneConfigFile } from '../operations/pruneConfigFile.js';

async function writeConfigFile(content: string): Promise<void> {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, content);
}

async function readRaw(): Promise<unknown> {
  return JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
}

describe('pruneConfigFile', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('returns defaults without creating a file when config.json is missing', async () => {
    const result = await pruneConfigFile();
    expect(result.pruned).toBe(false);
    expect(result.config).toEqual(DEFAULT_CONFIG);
    await expect(readFile(CONFIG_PATH, 'utf8')).rejects.toThrow();
  });

  it('rewrites the file and drops a leftover gemini section', async () => {
    await writeConfigFile(
      JSON.stringify({
        ratio: {
          gemini: { value: 40, enabled: true },
          codex: { value: 60, enabled: true },
          antigravity: { value: 50, enabled: false },
        },
        keywords: { gemini: 'g', codex: 'c', antigravity: 'a' },
      }),
    );
    const result = await pruneConfigFile();
    expect(result.pruned).toBe(true);
    const disk = (await readRaw()) as Record<string, Record<string, unknown>>;
    expect(disk.ratio).not.toHaveProperty('gemini');
    expect(disk.keywords).not.toHaveProperty('gemini');
    expect(disk.ratio).toEqual({
      codex: { value: 60, enabled: true },
      antigravity: { value: 40, enabled: true },
      claude: DEFAULT_CONFIG.ratio.claude,
    });
  });

  it('migrates a legacy integer ratio onto the antigravity slot', async () => {
    await writeConfigFile(JSON.stringify({ ratio: { gemini: 3, codex: 2 } }));
    const result = await pruneConfigFile();
    expect(result.pruned).toBe(true);
    const disk = (await readRaw()) as { ratio: Record<string, unknown> };
    expect(disk.ratio).toEqual({
      codex: { value: 40, enabled: true },
      antigravity: { value: 60, enabled: true },
      claude: DEFAULT_CONFIG.ratio.claude,
    });
  });

  it('leaves an already-canonical config untouched (pruned: false)', async () => {
    const canonical = `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`;
    await writeConfigFile(canonical);
    const result = await pruneConfigFile();
    expect(result.pruned).toBe(false);
    expect(await readFile(CONFIG_PATH, 'utf8')).toBe(canonical);
  });

  it('leaves a corrupt config file untouched', async () => {
    await writeConfigFile('{ not valid json');
    const result = await pruneConfigFile();
    expect(result.pruned).toBe(false);
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(await readFile(CONFIG_PATH, 'utf8')).toBe('{ not valid json');
  });
});
