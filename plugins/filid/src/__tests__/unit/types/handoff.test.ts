import { describe, expect, it } from 'vitest';

import {
  DEBT_ACTIONS,
  FIX_REQUEST_TYPES,
  PIPELINE_STAGES,
} from '../../../constants/handoffTokens.js';
import { normalizeFixRequestType } from '../../../lib/normalizeFixRequest.js';

describe('handoff token enums', () => {
  it('exposes the four fix request types in canonical order', () => {
    expect(FIX_REQUEST_TYPES).toEqual([
      'code-fix',
      'promote',
      'restructure',
      'harvest-required',
    ]);
  });

  it('exposes the four debt actions', () => {
    expect(DEBT_ACTIONS).toEqual([
      'create',
      'list',
      'resolve',
      'calculate-bias',
    ]);
  });

  it('exposes the four pipeline stages', () => {
    expect(PIPELINE_STAGES).toEqual([
      'pr-create',
      'review',
      'resolve',
      'revalidate',
    ]);
  });
});

describe('normalizeFixRequestType (tolerant parser)', () => {
  it('accepts bare code-fix', () => {
    expect(normalizeFixRequestType('code-fix')).toBe('code-fix');
  });

  it('accepts bare promote', () => {
    expect(normalizeFixRequestType('promote')).toBe('promote');
  });

  it('accepts bare restructure', () => {
    expect(normalizeFixRequestType('restructure')).toBe('restructure');
  });

  it('accepts harvest-required (bare and filid-prefixed)', () => {
    expect(normalizeFixRequestType('harvest-required')).toBe(
      'harvest-required',
    );
    expect(normalizeFixRequestType('filid:harvest-required')).toBe(
      'harvest-required',
    );
  });

  it('strips filid: prefix and accepts filid:promote', () => {
    expect(normalizeFixRequestType('filid:promote')).toBe('promote');
  });

  it('strips filid: prefix and accepts filid:restructure', () => {
    expect(normalizeFixRequestType('filid:restructure')).toBe('restructure');
  });

  it('strips filid: prefix and accepts filid:code-fix', () => {
    expect(normalizeFixRequestType('filid:code-fix')).toBe('code-fix');
  });

  it('trims surrounding whitespace after strip', () => {
    expect(normalizeFixRequestType('  filid:promote  ')).toBe('promote');
  });

  it('returns null for an unknown token', () => {
    expect(normalizeFixRequestType('unknown-type')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(normalizeFixRequestType('')).toBeNull();
  });

  it('returns null for filid: prefix with unknown body', () => {
    expect(normalizeFixRequestType('filid:unknown')).toBeNull();
  });
});
