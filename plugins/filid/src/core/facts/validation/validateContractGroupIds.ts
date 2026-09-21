import type { FileFacts } from '../schema/fileFactsSchema.js';

import type { FactsRejection } from './types/factsValidationTypes.js';
import { buildFactsRejection } from './utils/buildFactsRejection.js';
import { marksContractGroup } from './utils/marksContractGroup.js';

/** Contract group ids that survived the marker check, and the ones that did not. */
export interface ContractGroupValidation {
  verification: FileFacts['verification'];
  rejections: FactsRejection[];
}

/**
 * Apply the string-existence check to a record's contract group links.
 *
 * Same rule as references and exported names (spec §4.2), counted over the
 * marker rather than the id alone: the record claims the file carries
 * `filid:contract <id>`, so an id that merely occurs somewhere in the bytes —
 * in a string, in prose, as part of a longer word — has not been seen. filid
 * does not check that the marker sits in a comment; that would mean parsing,
 * and a marker quoted inside a string literal is a declared limitation the
 * same way it is for the line accounting (spec §4.5).
 *
 * An id no marker introduces is dropped with its own rejection, so one wrong
 * link does not discard the record around it.
 *
 * @param verification - The submitted verification section, or undefined when
 * the provider reported none — which is "not reported", not "empty".
 * @param lines - The file's current contents, split into lines.
 * @param path - Project-relative path of the owning record, for rejections.
 * @param pointer - JSON pointer of the owning record in the submission.
 * @returns The section to store, carrying only the links the bytes show.
 */
export function validateContractGroupIds(
  verification: FileFacts['verification'],
  lines: readonly string[],
  path: string,
  pointer: string,
): ContractGroupValidation {
  if (verification?.contractGroupIds === undefined)
    return { verification, rejections: [] };
  const accepted: string[] = [];
  const rejections: FactsRejection[] = [];
  for (const [index, id] of verification.contractGroupIds.entries()) {
    if (lines.some((line) => marksContractGroup(line, id))) {
      accepted.push(id);
      continue;
    }
    rejections.push(
      buildFactsRejection(
        path,
        `${pointer}/verification/contractGroupIds/${index}`,
        'CONTRACT_GROUP_ABSENT',
      ),
    );
  }
  return {
    verification: { ...verification, contractGroupIds: accepted },
    rejections,
  };
}
