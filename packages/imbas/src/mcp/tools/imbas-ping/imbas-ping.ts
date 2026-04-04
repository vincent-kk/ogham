/**
 * @file imbas-ping.ts
 * @description Health check tool — returns server status
 */

import { VERSION } from '../../../version.js';

export async function handleImbasPing() {
  return { status: 'ok', version: VERSION, timestamp: new Date().toISOString() };
}
