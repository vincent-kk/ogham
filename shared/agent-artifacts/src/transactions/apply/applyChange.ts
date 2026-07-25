import {
  assertNoSymlinkDescendantsSync,
  readFileIfExistsSync,
  removeFileIfExistsSync,
  writeFileAtomicallySync,
} from "@ogham/cross-platform/filesystem";

import type { FileChange } from "../types/transactionTypes.js";

export function applyChange(change: FileChange): void {
  assertNoSymlinkDescendantsSync(change.root, change.targetPath);
  const previous = readFileIfExistsSync(change.targetPath);

  if (change.backupPath !== undefined && previous !== null) {
    assertNoSymlinkDescendantsSync(change.root, change.backupPath);
    writeFileAtomicallySync(change.backupPath, previous);
  }

  if (change.content === null) removeFileIfExistsSync(change.targetPath);
  else writeFileAtomicallySync(change.targetPath, change.content);
}
