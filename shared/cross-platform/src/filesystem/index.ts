export { withFileLockSync } from "./locking/index.js";
export { ensureDirectorySync } from "./mutation/ensureDirectorySync.js";
export { removeFileIfExistsSync } from "./mutation/removeFileIfExistsSync.js";
export { writeFileAtomicallySync } from "./mutation/writeFileAtomicallySync.js";
export { listDirectoryIfExistsSync } from "./read/listDirectoryIfExistsSync.js";
export { readFileIfExistsSync } from "./read/readFileIfExistsSync.js";
export { readUtf8FileIfExistsSync } from "./read/readUtf8FileIfExistsSync.js";
export { assertNoSymlinkDescendantsSync } from "./safety/assertNoSymlinkDescendantsSync.js";
export type {
  AtomicWriteOptions,
  EnsureDirectoryOptions,
  FileLockOptions,
  FileLockResult,
} from "./types/types.js";
