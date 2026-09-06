import { observeReviewGroupInputs } from '../../../../../mcp/tools/reviewState/handlers/utils/observeReviewGroupInputs.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

/**
 * Rebuild fixture manifests after deliberately injecting legacy policy or canonical evidence.
 * @param state Synthetic prepared state used to isolate validation or recovery behavior.
 * @param paths Current fixture generation paths.
 * @param pluginRoot Fixture-owned canonical rule inputs.
 * @returns State whose manifests represent the injected test input consistently.
 */
export async function refreshReviewFixtureInputs(
  state: ReviewStateRecord,
  paths: ReviewStatePaths,
  pluginRoot: string,
): Promise<ReviewStateRecord> {
  return {
    ...state,
    groups: await observeReviewGroupInputs(
      state,
      paths,
      state.incremental?.userInstructions ?? '',
      state.incremental?.changeContext ?? undefined,
      pluginRoot,
    ),
  };
}
