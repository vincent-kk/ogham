import { portableJoin } from '@ogham/cross-platform/compat';

import { RUNTIME_FILE } from '../../../../constants/files.js';
import type { InterventionLevel } from '../../../../types/config.js';
import { ensureSeiriDir } from '../../../utils/ensureSeiriDir.js';
import { writeAtomically } from '../../../utils/writeAtomically.js';

/**
 * Turn the session valve to `intervention` and return the path written.
 *
 * Separate from `writeConfig` because the two layers answer to different
 * people: the baseline is the repository's declared posture and changes
 * through the setup surface with a diff, while this one is meant to be
 * cheap enough that "just turn it down" is a real answer. The companion
 * ignore file is created here so the cheap path can never widen into a
 * commit.
 */
export function writeRuntime(
  projectRoot: string,
  intervention: InterventionLevel,
): string {
  const path = portableJoin(ensureSeiriDir(projectRoot), RUNTIME_FILE);
  writeAtomically(path, `${JSON.stringify({ intervention }, null, 2)}\n`);
  return path;
}
