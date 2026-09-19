/**
 * Next action of a postcondition that passed while unknown files were judged
 * unrelated: the conclusion holds on the known edges only.
 * @param count Number of unknown files outside the plan's relevance.
 * @returns The sentence the summary carries instead of the plain `ok` action.
 */
export function describeKnownEdgesPostcondition(count: number): string {
  return `Restructure verified on the known edges: ${count} file(s) with unconfirmed references were judged unrelated to the plan (data.unknownFiles.other), so a cycle or boundary violation that runs only through their unread references would not show. Report the restructure as verified on the known edges and name those files; do not call it fully verified.`;
}
