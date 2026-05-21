import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { COGAIR_HOME, COUNTER_PATH } from '../../../constants/paths.js';
import { loadCounter } from '../loadCounter.js';

async function writeCounterFile(content: string): Promise<void> {
  await mkdir(dirname(COUNTER_PATH), { recursive: true });
  await writeFile(COUNTER_PATH, content);
}

describe('loadCounter', () => {
  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  it('returns null when counter.json is missing', async () => {
    expect(await loadCounter()).toBeNull();
  });

  it('returns the parsed counter when valid', async () => {
    const counter = { parent_pid: 100, gemini: 3, codex: 1 };
    await writeCounterFile(JSON.stringify(counter));
    expect(await loadCounter()).toEqual(counter);
  });

  it('returns null on malformed JSON', async () => {
    await writeCounterFile('not-json');
    expect(await loadCounter()).toBeNull();
  });

  it('returns null when schema validation fails', async () => {
    await writeCounterFile(
      JSON.stringify({ parent_pid: 'oops', gemini: 1, codex: 0 }),
    );
    expect(await loadCounter()).toBeNull();
  });
});
