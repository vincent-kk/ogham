/**
 * Next action of a postcondition that cannot assert an absence.
 *
 * "No new cycle" and "no new boundary violation" are absences, and an absence
 * only holds over files whose references are known (spec §5). The relevance
 * filter still says which unknown files relate to the plan, but it is a filter
 * and not a proof — an alias or a star re-export that never spells the moved
 * name slips through it — so the conclusion waits for the facts rather than
 * being reported on the edges that happened to be readable.
 * @param count Number of files the graph could not draw a conclusion from.
 * @returns The sentence the summary carries instead of the plain `ok` action.
 */
export function describeUnknownFilesPostcondition(count: number): string {
  return `Restructure not verified: ${count} file(s) in this project have no facts filid can conclude from, and they are listed with their causes in data.unknownFiles. A cycle or a boundary violation running only through their unread references would not show, so no absence is asserted. Submit those files' facts — call facts status, extract the files it lists with the extraction program named in its output requirement, and submit them — then run postcondition again.`;
}
