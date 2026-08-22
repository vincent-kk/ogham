import { EVIDENCE_MAX_CHARS } from '../../../constants/gates.js';

/**
 * Render a compact, single-line evidence excerpt with an optional exit suffix.
 *
 * @param text Observable command output or error text.
 * @param matchedLine First line that matched EXPECT when one exists.
 * @param exit Process exit code when the outcome carries one.
 * @returns Evidence capped at the configured final character limit.
 */
export function excerptEvidence(
  text: string,
  matchedLine: string | undefined,
  exit?: number,
): string {
  const lines = text.replaceAll('\r', '').split('\n');
  const last = [...lines]
    .reverse()
    .find((line) => line.trim() !== '')
    ?.trim();
  const matched = matchedLine?.replaceAll('\r', '').trim();
  const parts = [matched, last].filter(
    (part, index, values): part is string =>
      part !== undefined && part !== '' && values.indexOf(part) === index,
  );
  const base =
    parts.join(' | ') || (exit === undefined || exit === 0 ? 'exit 0' : '');
  const suffix = exit !== undefined && exit !== 0 ? ` (exit ${exit})` : '';
  if (base === '') return suffix.trimStart();
  if (base.length + suffix.length <= EVIDENCE_MAX_CHARS)
    return `${base}${suffix}`;

  const kept = Math.max(0, EVIDENCE_MAX_CHARS - suffix.length - 1);
  return `${base.slice(0, kept)}…${suffix}`;
}
