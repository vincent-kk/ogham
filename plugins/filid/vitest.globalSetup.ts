/**
 * @file vitest.globalSetup.ts
 * @description Named by `globalSetup` in `vitest.config.ts`; it runs in the
 * main process before the first worker starts and again after the last one
 * ends. That is the only place a test run can clean up after itself: a worker
 * is terminated rather than exited, so `exit`, `beforeExit` and `SIGTERM`
 * listeners registered inside one never run.
 */
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Give this run one temporary directory and remove it when the run ends.
 *
 * The path is canonical because what nests under it is judged by canonical
 * location: the facts store keys on a canonical project root, and the guarded
 * open refuses a path whose components include a symbolic link — so a fixture
 * reached through `/var` instead of `/private/var` would be filed as a
 * different project, or refused outright.
 *
 * Workers inherit the environment, so publishing the path there is what lets
 * them find it. Two runs in parallel get two directories and neither teardown
 * can reach the other's fixtures.
 * @returns The teardown that removes this run's directory. It swallows a
 * removal failure, because a temporary directory left behind must not turn a
 * passing run red.
 */
export default function setupTestRunRoot(): () => void {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'filid-test-run-'));
  process.env.FILID_TEST_RUN_ROOT = root;
  return () => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      // Best effort; the run's verdict is not this directory's business.
    }
  };
}
