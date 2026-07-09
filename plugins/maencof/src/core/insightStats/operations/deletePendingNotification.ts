/**
 * @file deletePendingNotification.ts
 * @description Delete the pending insight-capture notification file.
 */
import { existsSync, unlinkSync } from 'node:fs';

import { PENDING_FILE } from '../../../constants/insight.js';

import { metaPath } from './metaPath.js';

export function deletePendingNotification(cwd: string): void {
  const filePath = metaPath(cwd, PENDING_FILE);
  if (existsSync(filePath))
    try {
      unlinkSync(filePath);
    } catch {
      // Silent — best-effort cleanup
    }
}
