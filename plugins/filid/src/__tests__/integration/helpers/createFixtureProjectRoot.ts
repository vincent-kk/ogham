import { mkdtempSync, realpathSync } from 'node:fs';

import { portableJoin, tmp } from '@ogham/cross-platform';

/**
 * Create a temporary project root every tool spells the same way.
 *
 * The directory is canonicalized on the way out. A temporary directory is
 * often reached through a symbolic link, and the review tools resolve a
 * project through git, which answers with the real path — so a fixture that
 * kept the symbolic spelling would compare paths it wrote against paths the
 * tools report under another name. One spelling keeps those comparisons about
 * the behaviour under test.
 *
 * @param prefix - Name prefix of the temporary directory.
 * @returns The canonical absolute path of the new directory.
 */
export function createFixtureProjectRoot(prefix: string): string {
  return realpathSync(mkdtempSync(portableJoin(tmp(), prefix)));
}
