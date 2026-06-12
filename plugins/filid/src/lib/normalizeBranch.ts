/**
 * Normalize a git branch name to a filesystem-safe string.
 * `/` → `--`; `#@~^:?*[]\` → `_`; trims leading/trailing `.` and `-`.
 *
 * Shared by the reviewManage MCP tool (`.filid/review/<normalized>/`) and the
 * hook layer (`.filid/harvest/<normalized>/`); both directory schemes MUST
 * stay in lockstep, so this is the single implementation.
 */
export function normalizeBranch(branchName: string): string {
  return branchName
    .replace(/\//g, '--')
    .replace(/[#@~^:?*[\]\\]/g, '_')
    .replace(/^[.-]+/, '')
    .replace(/[.-]+$/, '');
}
