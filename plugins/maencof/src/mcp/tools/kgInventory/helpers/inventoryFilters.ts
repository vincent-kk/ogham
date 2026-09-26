import { LAYER_DIR } from '../../../../constants/architecture.js';
import { resolveWithinVault } from '../../../../core/pathGuard/index.js';
import type { KgInventoryInput } from '../../../../types/mcpKg.js';

/** Normalize public filters; reject paths that could escape or change meaning across hosts. */
export function inventoryFilters(vault: string, input: KgInventoryInput) {
  if (input.path_prefix?.startsWith('/'))
    throw new Error('invalid_inventory_input');
  const prefix = (input.path_prefix ?? '').replace(/\/$/, '');
  if (
    prefix &&
    (prefix.includes('\\') ||
      prefix
        .split('/')
        .some((part) => !part || part === '.' || part === '..') ||
      'error' in resolveWithinVault(vault, prefix))
  )
    throw new Error('invalid_inventory_input');
  const layers = [...(input.layer_filter ?? [])].sort();
  if (layers.some((layer) => !Object.keys(LAYER_DIR).includes(String(layer))))
    throw new Error('invalid_inventory_input');
  return { prefix, layers };
}
