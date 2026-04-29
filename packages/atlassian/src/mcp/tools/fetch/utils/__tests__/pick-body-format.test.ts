import { describe, it, expect } from 'vitest';
import { pickBodyFormat } from '../pick-body-format.js';

describe('pickBodyFormat', () => {
  it('returns adf for Jira on API v3', () => {
    expect(pickBodyFormat('jira', '3')).toBe('adf');
  });

  it('returns wiki for Jira on API v2', () => {
    expect(pickBodyFormat('jira', '2')).toBe('wiki');
  });

  it('returns storage for Confluence on API v3', () => {
    expect(pickBodyFormat('confluence', '3')).toBe('storage');
  });

  it('returns storage for Confluence on API v2', () => {
    expect(pickBodyFormat('confluence', '2')).toBe('storage');
  });
});
