import { describe, it, expect } from 'vitest';
import { convertBodyForUpdate } from '../convert-body-for-update.js';

describe('convertBodyForUpdate', () => {
  describe('basic', () => {
    it('renders Jira Cloud (apiVersion 3) description as ADF for PUT', () => {
      const out = convertBodyForUpdate({ description: '# H' }, 'jira', '3') as {
        description: { type: string };
      };
      expect(out.description.type).toBe('doc');
    });

    it('renders Jira Server (apiVersion 2) description as wiki string for PUT', () => {
      const out = convertBodyForUpdate({ description: '# H' }, 'jira', '2') as {
        description: string;
      };
      expect(out.description).toBe('h1. H');
    });

    it('renders Confluence body as storage object on update', () => {
      const out = convertBodyForUpdate({ body: '# H' }, 'confluence', '3') as {
        body: { storage: { value: string; representation: string } };
      };
      expect(out.body.storage.representation).toBe('storage');
    });
  });

  describe('edge', () => {
    it('returns body unchanged when null', () => {
      expect(convertBodyForUpdate(null, 'jira', '3')).toBeNull();
    });

    it('returns body unchanged when string', () => {
      expect(convertBodyForUpdate('plain', 'jira', '3')).toBe('plain');
    });

    it('renders nested fields.description as ADF on Jira Cloud update', () => {
      const out = convertBodyForUpdate(
        { fields: { description: '# H' } },
        'jira',
        '3',
      ) as { fields: { description: { type: string } } };
      expect(out.fields.description.type).toBe('doc');
    });

    it('renders nested fields.description as wiki on Jira Server update', () => {
      const out = convertBodyForUpdate(
        { fields: { description: '# H' } },
        'jira',
        '2',
      ) as { fields: { description: string } };
      expect(out.fields.description).toBe('h1. H');
    });

    it('does not mutate the input fields object', () => {
      const input = { fields: { description: '# H' } };
      convertBodyForUpdate(input, 'jira', '3');
      expect(input.fields.description).toBe('# H');
    });

    it('passes through non-string description in fields', () => {
      const input = { fields: { description: { keep: true } } };
      expect(convertBodyForUpdate(input, 'jira', '3')).toEqual(input);
    });

    it('renders Confluence body as storage on apiVersion 2 update (regression)', () => {
      const out = convertBodyForUpdate({ body: '# H' }, 'confluence', '2') as {
        body: { storage: { representation: string } };
      };
      expect(out.body.storage.representation).toBe('storage');
    });
  });
});
