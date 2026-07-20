import { join } from 'node:path';

import {
  CLAUDE_INSTRUCTIONS_FILE,
  INSTRUCTIONS_FILES,
} from '@ogham/cross-platform/instructions';

import { readMaencofSection } from '../../core/claudeMdMerger/operations/readMaencofSection.js';

/**
 * The instruction file this vault's maencof section lives in.
 *
 * A hook cannot ask which host it is on — the adapters inject `OGHAM_HOST` into the MCP
 * declaration only — so this follows the section rather than the host: whichever
 * instruction file already carries it is the one to keep updating. Off Claude the MCP
 * side writes `AGENTS.md`, and without this the SessionStart hook would find no section
 * in `CLAUDE.md` and insert a second copy of the directives there.
 *
 * Nothing deployed anywhere yet → `CLAUDE.md`, which is what this hook has always
 * written and the only channel measured to work.
 */
export function instructionsPath(cwd: string): string {
  for (const filename of INSTRUCTIONS_FILES) {
    const path = join(cwd, filename);
    if (readMaencofSection(path) !== null) return path;
  }
  return join(cwd, CLAUDE_INSTRUCTIONS_FILE);
}
