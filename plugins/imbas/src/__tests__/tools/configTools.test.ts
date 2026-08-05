import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
        'defaults.llm_model.refine': 'opus',
      },
    });

    const pk = (await handleConfigGet({ field: 'defaults.project_ref' })) as {
      value: unknown;
    };
    const lm = (await handleConfigGet({
      field: 'defaults.llm_model.refine',
    })) as { value: unknown };
    expect(pk.value).toBe('X');
    expect(lm.value).toBe('opus');
  });
});

describe('handleConfigSet — layer isolation', () => {
  let tmpDir: string;
  let userDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;
  let prevConfigDir: string | undefined;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    userDir = makeTmpDir();
    prevConfigDir = process.env.CLAUDE_CONFIG_DIR;
    process.env.CLAUDE_CONFIG_DIR = userDir;
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    process.env.CLAUDE_CONFIG_DIR = prevConfigDir;
  });

  function projectConfigPath(): string {
    return join(tmpDir, '.imbas', 'config.json');
  }

  it('writes only the named keys to the project layer, not user-layer values', async () => {
    const userConfigDir = join(userDir, 'plugins', 'imbas');
    mkdirSync(userConfigDir, { recursive: true });
    writeFileSync(
      join(userConfigDir, 'config.json'),
      JSON.stringify({ provider: 'github', github: { repo: 'acme/app' } }),
    );

    await handleConfigSet({
      scope: 'project',
      updates: { provider: 'local', 'defaults.project_ref': 'MARKA' },
    });

    const projectDoc = JSON.parse(readFileSync(projectConfigPath(), 'utf-8'));
    expect(projectDoc).toEqual({
      provider: 'local',
      defaults: { project_ref: 'MARKA' },
    });

    const effective = (await handleConfigGet({ field: 'github.repo' })) as {
      value: unknown;
    };
    expect(effective.value).toBe('acme/app');
  });

  it('rejects an update whose merge would violate the schema and leaves the file untouched', async () => {
    await handleConfigSet({ scope: 'project', updates: { provider: 'local' } });
    const before = readFileSync(projectConfigPath(), 'utf-8');

    await expect(
      handleConfigSet({ scope: 'project', updates: { provider: 'gitlab' } }),
    ).rejects.toThrow();

    expect(readFileSync(projectConfigPath(), 'utf-8')).toBe(before);
  });
});
