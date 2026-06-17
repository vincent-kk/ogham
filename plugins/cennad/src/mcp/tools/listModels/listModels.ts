import { getAvailableModels } from '../../../core/agyModels/index.js';

export interface ListAntigravityModelsInput {}

export interface ListAntigravityModelsOutput {
  models: string[];
}

// Returns the agy model full-names currently available to the account. Delegates
// caching/spawn to core/agyModels; never throws — an empty list means agy is
// missing or unauthenticated.
export async function handleListAntigravityModels(
  _input: ListAntigravityModelsInput = {},
): Promise<ListAntigravityModelsOutput> {
  const models = await getAvailableModels();
  return { models };
}
