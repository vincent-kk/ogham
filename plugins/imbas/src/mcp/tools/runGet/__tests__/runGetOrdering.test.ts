import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getRunsDir } from '../../../../core/paths/paths.js';
import {
  createRunState,
  saveRunState,
} from '../../../../core/stateManager/stateManager.js';
import { handleRunGet } from '../runGet.js';

/** Isolated workspace used by the latest-run queries. */
let workspace: string;
/** Directory holding valid executions and intentionally malformed entries. */
let runsDir: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'imbas-get-order-'));
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

describe('run_get latest numeric ID', () => {
  it('selects 1000 after 999 on the same date', async () => {
    await writeRun('20261105-999');
    await writeRun('20261105-1000');
    const result = await handleRunGet({
      project_root: workspace,
      project_ref: 'PROJ',
    });
    expect(result.state.run_id).toBe('20261105-1000');
  });

  it('compares the date before the numeric sequence', async () => {
    await writeRun('20261105-9999');
    await writeRun('20261106-001');
    const result = await handleRunGet({
      project_root: workspace,
      project_ref: 'PROJ',
    });
    expect(result.state.run_id).toBe('20261106-001');
  });

  it('ignores non-ID entries even when they have readable states', async () => {
    await writeRun('20261105-001');
    await writeRun('notes');
    await writeRun('20261105-999.backup');
    await writeRun('20261106-01');
    const result = await handleRunGet({
      project_root: workspace,
      project_ref: 'PROJ',
    });
    expect(result.state.run_id).toBe('20261105-001');
  });

  it('reports no runs when all entries are non-IDs', async () => {
    mkdirSync(join(runsDir, 'notes'));
    await expect(
      handleRunGet({ project_root: workspace, project_ref: 'PROJ' }),
    ).rejects.toThrow('No runs found for project: PROJ');
  });

  it.each(['missing', 'invalid JSON', 'invalid schema'])(
    'reports the latest %s state without falling back',
    async (damage) => {
      await writeRun('20261105-999');
      const latest = join(runsDir, '20261105-1000');
      mkdirSync(latest);
      if (damage !== 'missing')
        writeFileSync(
          join(latest, 'state.json'),
          damage === 'invalid JSON' ? '{' : '{}',
        );

      await expect(
        handleRunGet({ project_root: workspace, project_ref: 'PROJ' }),
      ).rejects.toThrow('20261105-1000');
    },
  );
});
