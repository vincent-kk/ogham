import { describe, it, expect } from 'vitest';
import { pickBodyFormat, renderByFormat } from '../pick-body-format.js';

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

describe('renderByFormat', () => {
  it('renders adf as a doc node', () => {
    const result = renderByFormat('# H', 'adf');
    expect(result).toMatchObject({ type: 'doc' });
  });

  it('renders storage as { storage: { value, representation } }', () => {
    const result = renderByFormat('# H', 'storage') as {
      storage: { value: string; representation: string };
    };
    expect(result.storage.representation).toBe('storage');
    expect(typeof result.storage.value).toBe('string');
    expect(result.storage.value.length).toBeGreaterThan(0);
  });

  it('renders wiki as a plain string', () => {
    expect(renderByFormat('# H', 'wiki')).toBe('h1. H');
  });

  it('renders empty markdown gracefully across formats', () => {
    expect(renderByFormat('', 'wiki')).toBe('');
    const adfEmpty = renderByFormat('', 'adf');
    expect(adfEmpty).toMatchObject({ type: 'doc' });
    const storageEmpty = renderByFormat('', 'storage') as {
      storage: { value: string };
    };
    expect(typeof storageEmpty.storage.value).toBe('string');
  });
});
