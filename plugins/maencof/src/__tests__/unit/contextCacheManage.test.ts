/**
 * @file contextCacheManage.test.ts
 * @description handleContextCacheManage 응답 계약 — turn context 본문 비반환.
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleContextCacheManage } from '../../mcp/tools/contextCacheManage/contextCacheManage.js';

describe('handleContextCacheManage — no turn-context echo', () => {
  let vault: string;

  beforeEach(() => {
    vault = mkdtempSync(join(tmpdir(), 'maencof-ctxcache-test-'));
    mkdirSync(join(vault, '.maencof-meta'), { recursive: true });
  });

  afterEach(() => {
    rmSync(vault, { recursive: true, force: true });
  });

  it('pin 신규 응답은 turnContext 본문 대신 contextChars만 보고한다', async () => {
    const result = await handleContextCacheManage(vault, {
      action: 'pin',
      node_id: '01_Core/values.md',
      node_title: 'Values',
      node_layer: 1,
    });

    expect(result.success).toBe(true);
    expect(result).not.toHaveProperty('turnContext');
    expect(typeof result['contextChars']).toBe('number');
  });

  it('refresh 응답은 turnContext 본문 대신 contextChars만 보고한다', async () => {
    const result = await handleContextCacheManage(vault, { action: 'refresh' });

    expect(result.success).toBe(true);
    expect(result).not.toHaveProperty('turnContext');
    expect(typeof result['contextChars']).toBe('number');
  });

  it('list 응답은 pinnedNodes만 담고 turnContext 본문이 없다', async () => {
    const result = await handleContextCacheManage(vault, { action: 'list' });

    expect(result.success).toBe(true);
    expect(result).not.toHaveProperty('turnContext');
    expect(Array.isArray(result['pinnedNodes'])).toBe(true);
  });
});
