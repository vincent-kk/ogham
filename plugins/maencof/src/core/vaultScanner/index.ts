export { scanVault } from './operations/scanVault.js';
export { buildSnapshot } from './operations/buildSnapshot.js';
export { computeChangeSet } from './operations/computeChangeSet.js';
export { readVaultFile } from './operations/readVaultFile.js';
export { scanIncrementalChanges } from './operations/scanIncrementalChanges.js';
export type {
  ChangeSet,
  FileSnapshot,
  ScannedFile,
  VaultScanOptions,
} from './types/types.js';
