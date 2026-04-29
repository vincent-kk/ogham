import { describe, it, expect } from 'vitest';
import { convertBody } from '../convert-body.js';

describe('convertBody', () => {
  describe('basic', () => {
    it('renders Jira Cloud (apiVersion 3) description as ADF', () => {
      const out = convertBody({ description: '# H' }, 'jira', '3') as {
        description: { type: string };
      };
      expect(out.description.type).toBe('doc');
    });

    it('renders Jira Server (apiVersion 2) description as wiki string', () => {
      const out = convertBody({ description: '# H' }, 'jira', '2') as {
        description: string;
      };
      expect(out.description).toBe('h1. H');
    });

    it('renders Confluence body as storage object (apiVersion 3)', () => {
      const out = convertBody({ body: '# H' }, 'confluence', '3') as {
        body: { storage: { value: string; representation: string } };
      };
      expect(out.body.storage.representation).toBe('storage');
      expect(typeof out.body.storage.value).toBe('string');
    });
  });

  describe('edge', () => {
    it('renders Confluence body as storage on apiVersion 2 (silent fallback)', () => {
      const out = convertBody({ body: '# H' }, 'confluence', '2') as {
        body: { storage: { representation: string } };
      };
      expect(out.body.storage.representation).toBe('storage');
    });

    it('converts both description and body in a single call', () => {
      const out = convertBody({ description: '# A', body: '# B' }, 'jira', '2') as {
        description: string;
        body: string;
      };
      expect(out.description).toBe('h1. A');
      expect(out.body).toBe('h1. B');
    });

    it('renders nested fields.description as ADF for Jira Cloud', () => {
      const out = convertBody(
        { fields: { description: '# H', summary: 'x' } },
        'jira',
        '3',
      ) as { fields: { description: { type: string }; summary: string } };
      expect(out.fields.description.type).toBe('doc');
      expect(out.fields.summary).toBe('x');
    });

    it('renders nested fields.description as wiki for Jira Server', () => {
      const out = convertBody(
        { fields: { description: '# H' } },
        'jira',
        '2',
      ) as { fields: { description: string } };
      expect(out.fields.description).toBe('h1. H');
    });

    it('preserves non-converted sibling fields alongside description', () => {
      const out = convertBody(
        { description: '# H', summary: 'keep', priority: { id: '1' } },
        'jira',
        '3',
      ) as { summary: string; priority: { id: string } };
      expect(out.summary).toBe('keep');
      expect(out.priority).toEqual({ id: '1' });
    });

    it('passes through non-string description in fields', () => {
      const input = { fields: { description: { keep: true } } };
      expect(convertBody(input, 'jira', '3')).toEqual(input);
    });

    it('passes through non-string description at top level', () => {
      const input = { description: 123 };
      expect(convertBody(input, 'jira', '3')).toEqual(input);
    });

    it('returns body unchanged when null', () => {
      expect(convertBody(null, 'jira', '3')).toBeNull();
    });

    it('returns body unchanged when undefined', () => {
      expect(convertBody(undefined, 'jira', '3')).toBeUndefined();
    });

    it('returns body unchanged when primitive string', () => {
      expect(convertBody('plain', 'jira', '3')).toBe('plain');
    });

    it('does not mutate top-level input object', () => {
      const input = { description: '# H' };
      convertBody(input, 'jira', '3');
      expect(input.description).toBe('# H');
    });

    it('does not mutate nested fields object', () => {
      const input = { fields: { description: '# H' } };
      convertBody(input, 'jira', '3');
      expect(input.fields.description).toBe('# H');
    });
  });
});
