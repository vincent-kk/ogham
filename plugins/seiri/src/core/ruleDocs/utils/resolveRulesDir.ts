import { portableJoin } from '@ogham/cross-platform/compat';

import { CLAUDE_DIR, RULES_DIR } from '../../../constants/files.js';
import { findRepoRoot } from '../../utils/findRepoRoot.js';

/**
 * Absolute path of a project's `.claude/rules/` — the directory the
 * harness auto-loads, and the single source of truth for which seiri
 * rules are active. Anchored at the repository root so a session opened
 * in a subdirectory still resolves the one real location.
 */
export function resolveRulesDir(projectRoot: string): string {
  return portableJoin(findRepoRoot(projectRoot), CLAUDE_DIR, RULES_DIR);
}
