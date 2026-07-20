import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';

import { MODE_AUDIT_FILE } from './constants/cacheFiles.js';
import { getCacheDir } from './sessionCache.js';

const log = createLogger('cache');

export interface ModeAuditEntry {
  timestamp: string;
  sessionId: string;
  tool: string;
  path: string;
  mode: 'spike' | 'normal';
  decision: 'allow' | 'deny' | 'exempt';
  rule: string;
  reason?: string;
}

/**
 * Append one allow/deny/exempt judgment to `<cacheDir>/mode-audit.jsonl`.
 * Audit trail for the spike mode gate — lets false approves/blocks be traced
 * back to the mode and rule that produced them. Never throws.
 */
export function appendModeAudit(cwd: string, entry: ModeAuditEntry): void {
  const cacheDir = getCacheDir(cwd);
  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    appendFileSync(
      join(cacheDir, MODE_AUDIT_FILE),
      `${JSON.stringify(entry)}\n`,
      'utf-8',
    );
  } catch (e) {
    log.debug('appendModeAudit failed:', e);
  }
}
