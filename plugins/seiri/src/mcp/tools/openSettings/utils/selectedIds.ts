import type { SaveBody } from '../types/settingsTypes.js';

/**
 * The rule ids a save body opts in. Shared by the preview and the write so
 * both read the same selection out of the same payload.
 */
export function selectedIds(body: SaveBody): string[] {
  return Object.entries(body.ruleDocs.selections)
    .filter(([, selected]) => selected)
    .map(([id]) => id);
}
