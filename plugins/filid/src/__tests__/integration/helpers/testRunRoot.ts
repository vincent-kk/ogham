/**
 * @file testRunRoot.ts
 * @description Reads `FILID_TEST_RUN_ROOT`, which `vitest.globalSetup.ts` puts
 * in the environment of the main process before any worker starts; a worker
 * inherits it. It is not a parameter because the fixtures that need it are
 * built deep inside helper chains that the run root never passes through.
 */

/**
 * The temporary directory this run cleans up when it ends.
 *
 * Nest a fixture that nothing else removes under it — a template built once and
 * only copied from, or a per-file state directory.
 * @returns That directory, or undefined when the run published none, as when a
 * single file is executed straight from an editor. A caller that gets undefined
 * falls back to the system temporary directory and leaves its directory behind,
 * which is what it would do anyway.
 */
export function testRunRoot(): string | undefined {
  return process.env.FILID_TEST_RUN_ROOT;
}
