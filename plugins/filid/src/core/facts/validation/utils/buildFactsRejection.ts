import {
  FACTS_REJECTION_CODES,
  FACTS_REJECTION_NEXT_ACTIONS,
} from '../../../../constants/facts.js';
import type { FactsRejection } from '../types/factsValidationTypes.js';

/**
 * Build one rejection, pairing its code with the next action declared for it.
 *
 * The two tables are keyed alike so a rejection can never carry a code whose
 * next action says something else — every stop has an action that changes the
 * state it stopped on (P5).
 *
 * @param path - Project-relative path of the record the rejection belongs to.
 * @param pointer - JSON pointer of the rejected element in the submission.
 * @param code - Shared key into the code and next-action tables.
 * @param specifier - Specifier of the reference, on a reference-level rejection.
 * @returns The rejection as `rejected[]` carries it.
 */
export function buildFactsRejection(
  path: string,
  pointer: string,
  code: keyof typeof FACTS_REJECTION_CODES,
  specifier?: string,
  inputPath?: string,
): FactsRejection {
  return {
    path,
    pointer,
    code: FACTS_REJECTION_CODES[code],
    nextAction: FACTS_REJECTION_NEXT_ACTIONS[FACTS_REJECTION_CODES[code]],
    ...(specifier === undefined ? {} : { specifier }),
    ...(inputPath === undefined ? {} : { inputPath }),
  };
}
