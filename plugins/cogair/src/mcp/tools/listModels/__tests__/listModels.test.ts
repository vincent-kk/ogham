import { rm } from 'node:fs/promises';

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { COGAIR_HOME } from '../../../../constants/paths.js';
import {
  installFakeBinary,
  prependToPath,
} from '../../../../dispatcher/__tests__/fakeBinary.js';
import { handleListAntigravityModels } from '../listModels.js';

const FAKE_AGY_MODELS_SCRIPT = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'models') {
  process.stdout.write('gemini-2.5-pro\\ngemini-2.0-flash\\n');
  process.exit(0);
}
process.exit(1);
`;

let handle: ReturnType<typeof installFakeBinary>;
let restorePath: () => void;

beforeAll(() => {
  handle = installFakeBinary('agy', FAKE_AGY_MODELS_SCRIPT);
  restorePath = prependToPath(handle.dir);
});

afterAll(async () => {
  restorePath();
  handle.cleanup();
  await rm(COGAIR_HOME, { recursive: true, force: true });
});

beforeEach(async () => {
  await rm(COGAIR_HOME, { recursive: true, force: true });
});

describe('handleListAntigravityModels', () => {
  it('returns {models:[...]} populated when agy is available', async () => {
    const result = await handleListAntigravityModels();
    expect(result).toEqual({ models: ['gemini-2.5-pro', 'gemini-2.0-flash'] });
  });

  it('result shape is exactly {models:string[]}', async () => {
    const result = await handleListAntigravityModels({});
    expect(Object.keys(result)).toEqual(['models']);
    expect(Array.isArray(result.models)).toBe(true);
    result.models.forEach((m) => expect(typeof m).toBe('string'));
  });

  it('never throws — resolves even when called with no argument', async () => {
    await expect(handleListAntigravityModels()).resolves.toBeDefined();
  });
});

describe('handleListAntigravityModels — agy unavailable', () => {
  let savedPath: string | undefined;

  beforeEach(() => {
    savedPath = process.env.PATH;
    process.env.PATH = '/nonexistent';
  });

  afterEach(() => {
    process.env.PATH = savedPath;
  });

  it('returns {models:[]} when agy is not on PATH', async () => {
    const result = await handleListAntigravityModels();
    expect(result).toEqual({ models: [] });
  });
});
