import type { ReviewScopeChange } from '../../state/reviewStateTypes.js';

function normalizeChange(status: string): ReviewScopeChange {
  if (status.startsWith('A')) return 'A';
  if (status.startsWith('D')) return 'D';
  return 'M';
}

/**
 * Parse NUL-delimited `git diff --name-status` output.
 * @param output Raw Git output with alternating status and path fields.
 * @returns Map from unchanged path bytes to normalized A/M/D status.
 */
export function parseChangedFileStatuses(
  output: string,
): Map<string, ReviewScopeChange> {
  const fields = output.split('\0').filter(Boolean);
  if (fields.length % 2 !== 0)
    throw new Error('git diff --name-status returned an incomplete record');
  const statuses = new Map<string, ReviewScopeChange>();
  for (let index = 0; index < fields.length; index += 2) {
    const status = fields[index];
    const path = fields[index + 1];
    if (!status || !path)
      throw new Error('git diff --name-status returned an empty field');
    statuses.set(path, normalizeChange(status));
  }
  return statuses;
}
