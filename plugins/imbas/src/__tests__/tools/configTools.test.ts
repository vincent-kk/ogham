import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleConfigGet } from '../../mcp/tools/configGet/index.js';
import { handleConfigSet } from '../../mcp/tools/configSet/index.js';

// --- helpers ---

function makeTmpDir(): string {
  const dir = join(
    os.tmpdir(),
    `imbas-cfg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeConfig(base: string, config: object): void {
  const dir = join(base, '.imbas');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify(config, null, 2));
}

const BASE_CONFIG = {
  defaults: {
    project_ref: 'DEFAULT',
    llm_model: {},
  },
  atlassian: {},
};

// --- tests ---

describe('handleConfigGet', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('returns full config when no field specified', async () => {
    writeConfig(tmpDir, BASE_CONFIG);
    const result = await handleConfigGet({});
    expect((result as unknown as typeof BASE_CONFIG).defaults.project_ref).toBe(
      'DEFAULT',
    );
  });

  it('returns specific field value via dot-path', async () => {
    writeConfig(tmpDir, BASE_CONFIG);
    const result = (await handleConfigGet({
      field: 'defaults.project_ref',
    })) as { field: string; value: unknown };
    expect(result.field).toBe('defaults.project_ref');
    expect(result.value).toBe('DEFAULT');
  });

  it('returns undefined for missing dot-path field', async () => {
    writeConfig(tmpDir, BASE_CONFIG);
    const result = (await handleConfigGet({
      field: 'nonexistent.deep.path',
    })) as { value: unknown };
    expect(result.value).toBeUndefined();
  });

  it('returns default config when config.json does not exist', async () => {
    // no writeConfig — file missing
    const result = await handleConfigGet({});
    expect(result).toBeDefined();
  });
});

describe('handleConfigSet', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('updates and saves config field', async () => {
    writeConfig(tmpDir, BASE_CONFIG);
    await handleConfigSet({
      scope: 'project',
      updates: { 'defaults.project_ref': 'UPDATED' },
    });

    // Verify the saved value
    const result = (await handleConfigGet({
      field: 'defaults.project_ref',
    })) as { value: unknown };
    expect(result.value).toBe('UPDATED');
  });

  it('applies multiple dot-path updates at once', async () => {
    writeConfig(tmpDir, BASE_CONFIG);
    await handleConfigSet({
      scope: 'project',
      updates: {
        'defaults.project_ref': 'X',
        'defaults.llm_model.validate': 'opus',
      },
    });

    const pk = (await handleConfigGet({ field: 'defaults.project_ref' })) as {
      value: unknown;
    };
    const lm = (await handleConfigGet({
      field: 'defaults.llm_model.validate',
    })) as { value: unknown };
    expect(pk.value).toBe('X');
    expect(lm.value).toBe('opus');
  });
});
