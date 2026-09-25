import { createHash } from 'node:crypto';

import { resolveWithinVault } from '../../../../core/pathGuard/index.js';
import { scanVault } from '../../../../core/vaultScanner/index.js';

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
