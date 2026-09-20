import { FACTS_ACTIONS } from '../../../constants/facts.js';

import { adjudicateItems } from './handlers/adjudicateItems.js';
import { compareFacts } from './handlers/compareFacts.js';
import { discardPending } from './handlers/discardPending.js';
import { reportFactsStatus } from './handlers/reportFactsStatus.js';
import { submitFacts } from './handlers/submitFacts.js';
import type { FactsInput, FactsResult } from './types/factsToolTypes.js';

/**
 * Dispatches one facts action to its focused handler.
 *
 * @param input - Validated action-specific facts input.
 * @returns The unchanged child payload for the selected action.
 */
export async function handleFacts(input: FactsInput): Promise<FactsResult> {
  switch (input.action) {
    case FACTS_ACTIONS.STATUS:
      return reportFactsStatus(input.path);
    case FACTS_ACTIONS.SUBMIT:
      return submitFacts(
        input.path,
        input.file,
        input.resolutionEpoch,
        input.actor,
      );
    case FACTS_ACTIONS.ADJUDICATE:
      return adjudicateItems(input);
    case FACTS_ACTIONS.COMPARE:
      return compareFacts(input);
    case FACTS_ACTIONS.DISCARD_PENDING:
      return discardPending(input);
  }
}
