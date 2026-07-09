/**
 * @file appendPendingCapture.ts
 * @description Append a capture to the pending insight notification.
 */
import { writeFileSync } from 'node:fs';

import { PENDING_FILE } from '../../../constants/insight.js';
import type {
  PendingInsightCapture,
  PendingInsightNotification,
} from '../../../types/insight.js';

import { ensureDir } from './ensureDir.js';
import { metaPath } from './metaPath.js';
import { readPendingNotification } from './readPendingNotification.js';

export function appendPendingCapture(
  cwd: string,
  capture: PendingInsightCapture,
  sessionId: string,
): void {
  const filePath = metaPath(cwd, PENDING_FILE);
  ensureDir(filePath);

  const existing = readPendingNotification(cwd);
  const notification: PendingInsightNotification = existing ?? {
    captures: [],
    sessionId,
    createdAt: new Date().toISOString(),
  };
  notification.captures.push(capture);

  writeFileSync(filePath, JSON.stringify(notification), 'utf-8');
}
