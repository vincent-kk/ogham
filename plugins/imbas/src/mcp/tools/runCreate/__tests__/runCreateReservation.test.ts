import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getRunsDir } from '../../../../core/paths/paths.js';
import { handleRunCreate } from '../runCreate.js';

vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
}));

/** Workspace containing the source file and isolated project runs. */
let workspace: string;
/** Source copied only after an exclusive run reservation succeeds. */
let sourceFile: string;
/** Existing parent directory used to inject a stale listing. */
let runsDir: string;

beforeEach(() => {
  workspace = fs.mkdtempSync(join(tmpdir(), 'imbas-create-reserve-'));
  sourceFile = join(workspace, 'input.md');
  fs.writeFileSync(sourceFile, 'new source');
  runsDir = getRunsDir(workspace, 'PROJ');
  fs.mkdirSync(runsDir, { recursive: true });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 5, 12));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  fs.rmSync(workspace, { recursive: true, force: true });
});

describe('run_create reservation', () => {
  it('retries a collision before copying any source into an existing run', async () => {
    const occupied = join(runsDir, '20261105-001');
    fs.mkdirSync(occupied);
    fs.writeFileSync(join(occupied, 'source.md'), 'existing source');
    vi.spyOn(fs, 'readdirSync').mockImplementationOnce(() => []);

    const result = await handleRunCreate({
      project_root: workspace,
      project_ref: 'PROJ',
      source_file: sourceFile,
    });

    expect(result.run_id).toBe('20261105-002');
    expect(fs.readFileSync(join(occupied, 'source.md'), 'utf8')).toBe(
      'existing source',
    );
    expect(fs.readFileSync(join(result.run_dir, 'source.md'), 'utf8')).toBe(
      'new source',
    );
  });

  it('keeps an incomplete reservation when copying the source fails', async () => {
    await expect(
      handleRunCreate({
        project_root: workspace,
        project_ref: 'PROJ',
        source_file: join(workspace, 'missing.md'),
      }),
    ).rejects.toThrow();

    expect(fs.readdirSync(runsDir)).toEqual(['20261105-001']);
    expect(fs.existsSync(join(runsDir, '20261105-001', 'state.json'))).toBe(
      false,
    );
  });
});
