import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CONFIG_PATH,
  COUNTER_PATH,
  sessionPath,
} from '../../../constants/paths.js';
import { atomicWrite } from '../../../lib/atomicWrite.js';
import {
  type Config,
  ConfigSchema,
  type Counter,
  CounterSchema,
  type SessionMeta,
  SessionMetaSchema,
} from '../../../types/index.js';

const fixturesDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
);

async function safeReadText(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

export async function readSessionFile(
  projectHash: string,
  sessionId: string,
): Promise<SessionMeta | null> {
  const text = await safeReadText(sessionPath(projectHash, sessionId));
  if (text === null) return null;
  return SessionMetaSchema.parse(JSON.parse(text));
}

export async function readCounter(): Promise<Counter | null> {
  const text = await safeReadText(COUNTER_PATH);
  if (text === null) return null;
  return CounterSchema.parse(JSON.parse(text));
}

export async function readConfig(): Promise<Config | null> {
  const text = await safeReadText(CONFIG_PATH);
  if (text === null) return null;
  return ConfigSchema.parse(JSON.parse(text));
}

export type FixtureName = 'custom' | 'disabled' | 'legacy' | 'corrupt';

export async function writeConfigFixture(name: FixtureName): Promise<void> {
  const fixture = await readFile(
    resolve(fixturesDir, `config.${name}.json`),
    'utf8',
  );
  await mkdir(dirname(CONFIG_PATH), { recursive: true, mode: 0o700 });
  await writeFile(CONFIG_PATH, fixture, { mode: 0o600 });
}

export interface CounterShape {
  parent_pid: number;
  gemini: number;
  codex: number;
}

export async function writeCounter(c: CounterShape): Promise<void> {
  await atomicWrite(COUNTER_PATH, `${JSON.stringify(c, null, 2)}\n`);
}

export async function writeRawConfig(text: string): Promise<void> {
  await mkdir(dirname(CONFIG_PATH), { recursive: true, mode: 0o700 });
  await writeFile(CONFIG_PATH, text, { mode: 0o600 });
}

export async function writeRawCounter(text: string): Promise<void> {
  await mkdir(dirname(COUNTER_PATH), { recursive: true, mode: 0o700 });
  await writeFile(COUNTER_PATH, text, { mode: 0o600 });
}
