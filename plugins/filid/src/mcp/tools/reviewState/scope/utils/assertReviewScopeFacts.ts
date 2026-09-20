import { FACTS_UNKNOWN_CAUSES } from '../../../../../constants/facts.js';
import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS,
} from '../../../../../constants/reviewState.js';
import type { UnknownFile } from '../../../../../types/fractal.js';
import { ToolDiagnosticError } from '../../../../errors/toolDiagnosticError.js';

/** States that leave a file unsettled; `tool-error` is accepted (spec §9). */
const UNSETTLED_CAUSES: ReadonlySet<string> = new Set([
  FACTS_UNKNOWN_CAUSES.MISSING,
  FACTS_UNKNOWN_CAUSES.NEEDS_RESOLUTION,
  FACTS_UNKNOWN_CAUSES.UNCERTAIN,
]);

/** Paths one message names before it points at `facts status` for the rest. */
const NAMED_LIMIT = 10;

/** The order causes are reported in, so two runs read the same way. */
const REPORTED_CAUSES = [
  FACTS_UNKNOWN_CAUSES.MISSING,
  FACTS_UNKNOWN_CAUSES.NEEDS_RESOLUTION,
  FACTS_UNKNOWN_CAUSES.UNCERTAIN,
] as const;

/**
 * Refuse to build review evidence from facts nobody has settled (spec §9).
 *
 * The scope is the review's, not the project's: one unrelated file with no
 * record must not stop a review, which is the whole point of the relevance
 * filter. `tool-error` passes the gate — no tool can settle that file, and a
 * changed one is reported as a finding instead — while `missing`,
 * `needs-resolution` and `uncertain` all have an action that ends them.
 *
 * Refusing here rather than in each caller is deliberate: prepare and handoff
 * share this computation, and a gate a new caller can forget is not a gate.
 *
 * @param inScopeUnknownFiles - Unknown files the review scope holds.
 * @throws `facts-incomplete` naming the unsettled files and the bootstrap.
 */
export function assertReviewScopeFacts(
  inScopeUnknownFiles: readonly UnknownFile[],
): void {
  const unsettled = inScopeUnknownFiles.filter((file) =>
    file.causes.some((cause) => UNSETTLED_CAUSES.has(cause)),
  );
  if (unsettled.length === 0) return;
  // Grouped by cause because the causes take different actions: naming the
  // files alone sends the caller to re-extract the ones re-extraction cannot
  // change, and the refusal then repeats forever (P5).
  const grouped = REPORTED_CAUSES.flatMap((cause) => {
    const paths = unsettled
      .filter((file) => file.causes.includes(cause))
      .map((file) => file.path)
      .sort();
    return paths.length === 0
      ? []
      : [`${cause} (${paths.length}): ${describe(paths)}`];
  });
  throw new ToolDiagnosticError(
    REVIEW_STATE_DIAGNOSTIC_CODES.FACTS_INCOMPLETE,
    `${unsettled.length} file(s) in the review scope have no settled facts — ${grouped.join('; ')}.`,
    REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.FACTS_INCOMPLETE,
  );
}

/**
 * Name up to `NAMED_LIMIT` paths and count the rest honestly.
 * @param paths Sorted project-relative paths of one cause.
 * @returns The list as one message fragment.
 */
function describe(paths: readonly string[]): string {
  const named = paths.slice(0, NAMED_LIMIT).join(', ');
  return paths.length > NAMED_LIMIT
    ? `${named} and ${paths.length - NAMED_LIMIT} more that facts status lists`
    : named;
}
