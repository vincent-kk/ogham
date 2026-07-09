/**
 * @file readPendingNotification.ts
 * @description Read the pending insight-capture notification, or null.
 */
import { existsSync, readFileSync } from 'node:fs';

import { PENDING_FILE } from '../../../constants/insight.js';
import type { PendingInsightNotification } from '../../../types/insight.js';

import { metaPath } from './metaPath.js';

export function readPendingNotification(
  cwd: string,
): PendingInsightNotification | null {
  const filePath = metaPath(cwd, PENDING_FILE);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(
      readFileSync(filePath, 'utf-8'),
    ) as PendingInsightNotification;
  } catch {
    return null;
  }
}
