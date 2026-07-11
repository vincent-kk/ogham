/**
 * @file isDateInWindow.test.ts
 * @description YYYY-MM-DD 시간창 포함 판정 — inclusive 양 끝, 단독 bound, 역전 bound.
 */
import { describe, expect, it } from 'vitest';

import { isDateInWindow } from '../operations/isDateInWindow.js';

describe('isDateInWindow — basic', () => {
  it('both bounds present and date in range → true', () => {
    expect(isDateInWindow('2026-03-15', '2026-01-01', '2026-12-31')).toBe(true);
  });

  it('neither bound → always true', () => {
    expect(isDateInWindow('2026-03-15')).toBe(true);
    expect(isDateInWindow('1999-01-01')).toBe(true);
  });

  it('since greater than until → always false', () => {
    expect(isDateInWindow('2026-03-15', '2026-12-31', '2026-01-01')).toBe(
      false,
    );
  });
});

describe('isDateInWindow — edge cases', () => {
  it('since-only keeps date >= since (updated_after)', () => {
    expect(isDateInWindow('2026-06-01', '2026-06-01')).toBe(true);
    expect(isDateInWindow('2026-12-31', '2026-06-01')).toBe(true);
  });

  it('since-only rejects date < since', () => {
    expect(isDateInWindow('2026-05-31', '2026-06-01')).toBe(false);
  });

  it('until-only keeps date <= until', () => {
    expect(isDateInWindow('2026-06-01', undefined, '2026-06-01')).toBe(true);
    expect(isDateInWindow('2026-01-01', undefined, '2026-06-01')).toBe(true);
  });

  it('until-only rejects date > until', () => {
    expect(isDateInWindow('2026-06-02', undefined, '2026-06-01')).toBe(false);
  });

  it('inclusive lower boundary: date == since → true', () => {
    expect(isDateInWindow('2026-01-01', '2026-01-01', '2026-12-31')).toBe(true);
  });

  it('inclusive upper boundary: date == until → true', () => {
    expect(isDateInWindow('2026-12-31', '2026-01-01', '2026-12-31')).toBe(true);
  });

  it('both bounds: date below since → false', () => {
    expect(isDateInWindow('2025-12-31', '2026-01-01', '2026-12-31')).toBe(
      false,
    );
  });

  it('both bounds: date above until → false', () => {
    expect(isDateInWindow('2027-01-01', '2026-01-01', '2026-12-31')).toBe(
      false,
    );
  });
});
