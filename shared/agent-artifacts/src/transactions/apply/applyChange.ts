import {
  assertNoSymlinkDescendantsSync,
  readFileIfExistsSync,
  removeFileIfExistsSync,
  writeFileAtomicallySync,
} from "@ogham/cross-platform";

import type { FileChange } from "../types/transactionTypes.js";

/**
 * Applies one contained target and records backups immediately after their write.
 * @param change Validated target mutation within its declared root.
 * @param backupPaths Receives each completed backup even if the target write throws.
 * @returns Nothing; target and backup writes are the observable effects.
 * @throws When containment, reading, backing up, or changing the target fails.
 */
export function applyChange(change: FileChange, backupPaths: string[]): void {
  assertNoSymlinkDescendantsSync(change.root, change.targetPath);
  const previous = readFileIfExistsSync(change.targetPath);

  if (change.backupPath !== undefined && previous !== null) {
    assertNoSymlinkDescendantsSync(change.root, change.backupPath);
    writeFileAtomicallySync(change.backupPath, previous);
    backupPaths.push(change.backupPath);
  }

  if (change.content === null) removeFileIfExistsSync(change.targetPath);
  else writeFileAtomicallySync(change.targetPath, change.content);
}
