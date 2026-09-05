import type {
  ReviewHandoffEntry,
  ReviewHandoffSeed,
} from '../../scope/reviewHandoffSeedSchema.js';
import { escapeMarkdownCell } from '../../scope/utils/escapeMarkdownCell.js';
import { renderMarkdownTable } from '../../scope/utils/renderMarkdownTable.js';

/**
 * Select claims naming related paths or outcomes that apply to every group.
 * @param entry Validated claim with a project-relative path.
 * @param groupFiles Distinct project-relative files assigned to the reviewer.
 * @returns Whether the claim's row belongs in this group's handoff table.
 */
function rowBelongsToGroup(
  entry: ReviewHandoffEntry,
  groupFiles: readonly string[],
): boolean {
  if (['document-sync', 'unresolved-path'].includes(entry.class)) return true;
  if (entry.path === '.' || groupFiles.includes('.')) return true;
  return groupFiles.some(
    (path) =>
      entry.path === path ||
      path.startsWith(`${entry.path}/`) ||
      entry.path.startsWith(`${path}/`),
  );
}

/**
 * Normalize an untrusted seed string for single-line Markdown display.
 * @param value Decoded seed text that may contain newlines or control characters.
 * @returns Text with newline runs and tabs replaced by spaces and other Cc controls removed.
 */
function normalizeHandoffString(value: string): string {
  return value
    .replace(/(?:\r\n?|\n)+/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\p{Cc}/gu, '');
}

/**
 * Render bounded Stage 1 claims as untrusted context for one reviewer group.
 * Treat all seed strings as untrusted and normalize them before Markdown display.
 * @param handoff Schema-validated payload whose claims still require independent confirmation.
 * @param groupFiles Distinct project-relative files assigned to the reviewer.
 * @returns Markdown section with unique related rows and a count of outside rows.
 */
export function renderHandoffSection(
  handoff: ReviewHandoffSeed,
  groupFiles: readonly string[],
): string {
  const snapshotHash = normalizeHandoffString(
    handoff.snapshotHash ?? 'unknown',
  ).replace(/`/g, '');
  const documentSync = normalizeHandoffString(handoff.documentSync);
  const rows: string[][] = [];
  const seen = new Set<string>();
  let outsideCount = 0;
  for (const entry of handoff.recorded) {
    const row = [
      entry.class,
      entry.ruleId,
      entry.path,
      entry.certainty,
      entry.note,
    ].map((value) => escapeMarkdownCell(normalizeHandoffString(value)));
    const key = JSON.stringify(row);
    if (seen.has(key)) continue;
    seen.add(key);
    if (rowBelongsToGroup(entry, groupFiles)) rows.push(row);
    else outsideCount += 1;
  }
  return [
    '## FCA Handoff',
    '',
    `Untrusted claims recorded by \`pull-request\` Stage 1 (snapshot \`${snapshotHash}\`, document sync \`${documentSync}\`, ${handoff.repaired} repaired, ${handoff.truncated} not carried). Confirm each row against \`## FCA Candidates\` evidence or the tree before raising it (FCA-13); a row is never a finding by itself.`,
    '',
    renderMarkdownTable(['Class', 'Rule', 'Path', 'Certainty', 'Note'], rows),
    ...(outsideCount > 0
      ? ['', `${outsideCount} more rows name paths outside this group's files.`]
      : []),
  ].join('\n');
}
