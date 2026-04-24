import type { SyncAction } from '../../../../types/drift.js';

export function isReversible(action: SyncAction): boolean {
  switch (action) {
    case 'rename':
    case 'create-index':
    case 'create-main':
    case 'reclassify':
      return true;
    case 'move':
    case 'split':
    case 'merge':
      return false;
  }
}
