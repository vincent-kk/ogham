import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  autoAdjustSensitivity,
  calculatePrecision,
  updatePromotionStats,
  readInsightStats,
} from '../../../core/insight-stats/insight-stats.js';
import type { InsightStats } from '../../../types/insight.js';

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'maencof-precision-test-'));
}

function ensureMeta(cwd: string): void {
  mkdirSync(join(cwd, '.maencof-meta'), { recursive: true });
}

function writeStats(cwd: string, stats: Partial<InsightStats>): void {
  const full: InsightStats = {
    total_captured: 0,
    l2_direct: 0,
    l5_captured: 0,
    l5_promoted: 0,
    l5_archived: 0,
    updatedAt: '',
    ...stats,
  };
  writeFileSync(
    join(cwd, '.maencof-meta', 'auto-insight-stats.json'),
    JSON.stringify(full, null, 2),
  );
}

describe('insight-stats precision', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
    ensureMeta(cwd);
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  // Happy path (3)
  it('calculatePrecision returns correct ratio', () => {
    const stats: InsightStats = {
      total_captured: 10, l2_direct: 0, l5_captured: 10,
      l5_promoted: 7, l5_archived: 3, updatedAt: '',
    };
    expect(calculatePrecision(stats)).toBe(0.7);
  });

  it('updatePromotionStats increments promoted count', () => {
    writeStats(cwd, { l5_promoted: 0, l5_archived: 0 });
    updatePromotionStats(cwd, 'promoted');
    const stats = readInsightStats(cwd);
    expect(stats.l5_promoted).toBe(1);
  });

  it('updatePromotionStats increments archived count', () => {
    writeStats(cwd, { l5_promoted: 0, l5_archived: 0 });
    updatePromotionStats(cwd, 'archived');
    const stats = readInsightStats(cwd);
    expect(stats.l5_archived).toBe(1);
  });

  // Edge cases
  it('calculatePrecision returns null when denominator is 0', () => {
    const stats: InsightStats = {
      total_captured: 0, l2_direct: 0, l5_captured: 0,
      l5_promoted: 0, l5_archived: 0, updatedAt: '',
    };
    expect(calculatePrecision(stats)).toBeNull();
  });

  it('calculatePrecision returns 1.0 when all promoted', () => {
    const stats: InsightStats = {
      total_captured: 5, l2_direct: 0, l5_captured: 5,
      l5_promoted: 5, l5_archived: 0, updatedAt: '',
    };
    expect(calculatePrecision(stats)).toBe(1.0);
  });

  it('calculatePrecision returns 0.0 when all archived', () => {
    const stats: InsightStats = {
      total_captured: 5, l2_direct: 0, l5_captured: 5,
      l5_promoted: 0, l5_archived: 5, updatedAt: '',
    };
    expect(calculatePrecision(stats)).toBe(0.0);
  });

  it('autoAdjustSensitivity returns no message when no data', () => {
    const result = autoAdjustSensitivity(cwd);
    expect(result.adjusted).toBe(false);
    expect(result.message).toBeNull();
  });

  it('autoAdjustSensitivity recommends downgrade when precision < 0.3', () => {
    writeStats(cwd, { l5_promoted: 1, l5_archived: 9 });
    // default config sensitivity is 'medium'
    const result = autoAdjustSensitivity(cwd);
    expect(result.message).toContain('low');
  });

  it('autoAdjustSensitivity recommends upgrade when precision > 0.8', () => {
    writeStats(cwd, { l5_promoted: 9, l5_archived: 1 });
    const result = autoAdjustSensitivity(cwd);
    expect(result.message).toContain('high');
  });

  it('autoAdjustSensitivity returns null when precision is in range', () => {
    writeStats(cwd, { l5_promoted: 5, l5_archived: 5 });
    const result = autoAdjustSensitivity(cwd);
    expect(result.message).toBeNull();
  });
});
