import { FACTS_STATUS_LIST_LIMIT } from '../../../../../constants/facts.js';
import type { FactsFileList } from '../../types/factsToolTypes.js';

/**
 * Bound one response list, reporting how many entries it left out.
 *
 * A project whose facts have never been submitted has every scanned file in
 * `missing`, which on a repository of a few thousand files would be the whole
 * response. The count is what keeps the list honest once it is cut: a caller
 * that sees a remainder knows to submit and call again rather than reading the
 * short list as the whole answer.
 *
 * @param paths - Project-relative paths in the order they should be reported.
 * @returns The first `FACTS_STATUS_LIST_LIMIT` paths and the number omitted.
 */
export function capFileList(paths: readonly string[]): FactsFileList {
  return {
    paths: paths.slice(0, FACTS_STATUS_LIST_LIMIT),
    truncated: Math.max(0, paths.length - FACTS_STATUS_LIST_LIMIT),
  };
}
