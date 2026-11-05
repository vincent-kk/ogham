import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getRunsDir } from '../../../../core/paths/paths.js';
import {
  createRunState,
  saveRunState,
} from '../../../../core/stateManager/stateManager.js';
import { handleRunList } from '../runList.js';

/** Isolated workspace used by ordered run listings. */
let workspace: string;
/** Directory holding normal, damaged, and non-ID entries. */
let runsDir: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'imbas-list-order-'));
  runsDir = getRunsDir(workspace, 'PROJ');
  mkdirSync(runsDir, { recursive: true });
});

afterEach(() => rmSync(workspace, { recursive: true, force: true }));

/** Persist a readable initial state for the supplied directory name. */
async function writeRun(runId: string): Promise<void> {
  const state = createRunState({
    run_id: runId,
    project_ref: 'PROJ',
    source_file: '/input.md',
  });
  await saveRunState(join(runsDir, runId), state);
}

describe('run_list numeric ID ordering', () => {
  it('sorts by date and then numeric sequence beyond three digits', async () => {
    for (const id of [
      '20261106-001',
      '20261105-1000',
      '20261105-999',
      '20261104-9999',
    ])
      await writeRun(id);
    const result = await handleRunList({
      project_root: workspace,
      project_ref: 'PROJ',
    });
    expect(result.runs.map((run) => run.run_id)).toEqual([
      '20261104-9999',
      '20261105-999',
      '20261105-1000',
      '20261106-001',
    ]);
  });

  it('ignores non-ID entries while retaining valid unreadable runs', async () => {
    await writeRun('20261105-999');
    await writeRun('notes');
    mkdirSync(join(runsDir, '20261105-1000'));
    mkdirSync(join(runsDir, '20261105-1001'));
    writeFileSync(join(runsDir, '20261105-1001', 'state.json'), '{}');
    writeFileSync(join(runsDir, '.DS_Store'), 'metadata');
    mkdirSync(join(runsDir, '20261105-999.backup'));

    const result = await handleRunList({
      project_root: workspace,
      project_ref: 'PROJ',
    });
    expect(result.runs).toEqual([
      expect.objectContaining({ run_id: '20261105-999', status: 'pending' }),
      {
        run_id: '20261105-1000',
        run_dir: join(runsDir, '20261105-1000'),
        error: 'failed to load state',
      },
      {
        run_id: '20261105-1001',
        run_dir: join(runsDir, '20261105-1001'),
        error: 'failed to load state',
      },
    ]);
  });

  it('returns an empty list when only non-ID entries exist', async () => {
    await writeRun('notes');
    mkdirSync(join(runsDir, '20261105-01'));
    const result = await handleRunList({
      project_root: workspace,
      project_ref: 'PROJ',
    });
    expect(result.runs).toEqual([]);
  });
});
