/**
 * @file imbas-ping.ts
 * @description Health check tool — returns server status
 */

import { VERSION } from '../../version.js';
import { toolResult } from '../shared.js';

export async function handleImbasPing() {
  return toolResult({
    status: 'ok',
    version: VERSION,
    timestamp: new Date().toISOString(),
  });
}
