import { createHash } from 'node:crypto';

import { LAYER_DIR } from '../../../../constants/architecture.js';
import { resolveWithinVault } from '../../../../core/pathGuard/index.js';
import { scanVault } from '../../../../core/vaultScanner/index.js';
import type { Layer } from '../../../../types/common.js';
import type { KgInventoryInput } from '../../../../types/mcpKg.js';

/** Normalize public filters; reject paths that could escape or change meaning across hosts. */
export function inventoryFilters(vault: string, input: KgInventoryInput) {
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

/** Capture all active file identities for pagination, including files outside the requested prefix. */
export async function inventorySnapshot(vault: string) {
  const files = await scanVault(vault, { followSymlinks: false });
  files.sort((a, b) =>
    a.relativePath < b.relativePath
      ? -1
      : a.relativePath > b.relativePath
        ? 1
        : 0,
  );
  const identities = files.map((file) => {
      const guarded = resolveWithinVault(vault, file.relativePath);
      if ('error' in guarded) throw new Error('inventory_changed');
      return [file.relativePath, file.mtime, file.size];
    });
  return {
    files,
    snapshot_id: createHash('sha256')
      .update(JSON.stringify(identities))
      .digest('hex'),
  };
}

/** Resolve a scanner-owned path's layer without relying on possibly damaged frontmatter. */
export function inventoryLayer(path: string): Layer {
  return Number(
    Object.entries(LAYER_DIR).find(
      ([, directory]) => directory === path.split('/')[0],
    )![0],
  ) as Layer;
}

/** Validate an opaque continuation against both disk identity and canonical filters. */
export function inventoryOffset(
  cursor: string | undefined,
  snapshot: string,
  filters: string,
): number {
  if (!cursor) return 0;
  let value;
  try {
    value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new Error('invalid_inventory_input');
  }
  if (
    !value ||
    !Number.isSafeInteger(value.offset) ||
    value.offset < 1 ||
    typeof value.snapshot !== 'string' ||
    typeof value.filters !== 'string'
  )
    throw new Error('invalid_inventory_input');
  if (value.snapshot !== snapshot || value.filters !== filters)
    throw new Error('inventory_changed');
  return value.offset as number;
}
