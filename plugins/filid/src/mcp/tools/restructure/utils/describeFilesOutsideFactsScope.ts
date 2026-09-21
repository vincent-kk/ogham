import type { RESTRUCTURE_ACTIONS } from '../../../../constants/mcpContracts.js';

/**
 * Sentence a validation appends when its scope left part of the project unread.
 *
 * `unknownFiles` counts files the scope covers but has no usable facts for, so
 * a file the scope never claimed leaves no trace in it. Without this sentence a
 * validation over a narrowed scope reads as a verdict over the whole project.
 * @param count Scanned files the declared facts scope excludes.
 * @param action The validation action to run again once they are covered.
 * @returns The sentence appended to the summary's next action.
 */
export function describeFilesOutsideFactsScope(
  count: number,
  action:
    | typeof RESTRUCTURE_ACTIONS.PRECONDITION
    | typeof RESTRUCTURE_ACTIONS.POSTCONDITION,
): string {
  return `${count} file(s) of this project sit outside the declared facts scope, so no reference-based rule was applied to them and nothing above is asserted about their references. To judge them too, add their paths to facts.covers in the project's .filid/config.json, submit their facts — call facts status, extract the files it lists with the extraction program named in its output requirement, and submit them — then run ${action} again.`;
}
