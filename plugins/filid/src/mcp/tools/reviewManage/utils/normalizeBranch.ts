/**
 * Normalize a git branch name to a filesystem-safe string.
 * `/` → `--`; `#@~^:?*[]\` → `_`; trims leading/trailing `.` and `-`.
 */
export function normalizeBranch(branchName: string): string {
  return branchName
    .replace(/\//g, '--')
    .replace(/[#@~^:?*[\]\\]/g, '_')
    .replace(/^[.-]+/, '')
    .replace(/[.-]+$/, '');
}
