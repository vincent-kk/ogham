import {
  buildKnowledgeNode,
  parseDocument,
} from '../../../core/documentParser/index.js';
import { readVaultFile } from '../../../core/vaultScanner/index.js';
import type {
  KgInventoryInput,
  KgInventoryItem,
  KgInventoryResult,
} from '../../../types/mcpKg.js';

import {
  inventoryFilters,
  inventoryLayer,
  inventoryOffset,
  inventorySnapshot,
} from './helpers/snapshot.js';

/** Read a page from disk independently of graph availability; detect snapshot drift before returning. */
export async function handleKgInventory(
  vaultPath: string,
  input: KgInventoryInput,
): Promise<KgInventoryResult | { error: string }> {
  try {
    const limit = input.limit ?? 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > 200)
      throw new Error('invalid_inventory_input');
    const filter = inventoryFilters(vaultPath, input);
    const filters = JSON.stringify(filter);
    const snapshot = await inventorySnapshot(vaultPath);
    const offset = inventoryOffset(input.cursor, snapshot.snapshot_id, filters);
    const files = snapshot.files.filter(
      (file) =>
        (!filter.prefix ||
          file.relativePath === filter.prefix ||
          file.relativePath.startsWith(filter.prefix + '/')) &&
        (!filter.layers.length ||
          filter.layers.includes(inventoryLayer(file.relativePath))),
    );
    if (offset > files.length) throw new Error('invalid_inventory_input');
    const items: KgInventoryItem[] = [];
    for (const file of files.slice(offset, offset + limit)) {
      const content = await readVaultFile(vaultPath, file.relativePath);
      const item: KgInventoryItem = {
        path: file.relativePath,
        mtime: file.mtime,
        layer: inventoryLayer(file.relativePath),
      };
      try {
        const parsed = buildKnowledgeNode(
          parseDocument(file.relativePath, content, file.mtime),
        );
        if (!parsed.success || !parsed.node)
          item.parse_error = parsed.error ?? 'Invalid document';
        else
          Object.assign(item, {
            title: parsed.node.title,
            sub_layer: parsed.node.subLayer,
            gist: parsed.node.gist,
            tags: parsed.node.tags,
          });
      } catch {
        item.parse_error = 'Document parsing failed';
      }
      items.push(item);
    }
    if (
      (await inventorySnapshot(vaultPath)).snapshot_id !== snapshot.snapshot_id
    )
      throw new Error('inventory_changed');
    const next = offset + items.length;
    return {
      items,
      total: files.length,
      snapshot_id: snapshot.snapshot_id,
      ...(next < files.length
        ? {
            next_cursor: Buffer.from(
              JSON.stringify({
                snapshot: snapshot.snapshot_id,
                filters,
                offset: next,
              }),
            ).toString('base64url'),
          }
        : {}),
      ...(items.some((item) => item.parse_error)
        ? {
            warnings: [
              'Malformed documents are included; inspect parse_error before classification.',
            ],
          }
        : {}),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error && error.message === 'invalid_inventory_input'
          ? 'invalid_inventory_input'
          : 'inventory_changed',
    };
  }
}
