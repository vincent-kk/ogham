import { describe, it, expect } from 'vitest';
import { convertBodyForCreate } from '../convert-body-for-create.js';

describe('convertBodyForCreate', () => {
  describe('basic', () => {
    it('renders Jira Cloud (apiVersion 3) description as ADF', () => {
      const out = convertBodyForCreate({ description: '# H' }, 'jira', '3') as {
        description: { type: string };
      };
      expect(out.description.type).toBe('doc');
    });

    it('renders Jira Server (apiVersion 2) description as wiki string', () => {
      const out = convertBodyForCreate({ description: '# H' }, 'jira', '2') as {
        description: string;
      };
      expect(out.description).toBe('h1. H');
    });

    it('renders Confluence body as storage object regardless of apiVersion', () => {
      const out = convertBodyForCreate({ body: '# H' }, 'confluence', '3') as {
        body: { storage: { value: string; representation: string } };
      };
      expect(out.body.storage.representation).toBe('storage');
      expect(typeof out.body.storage.value).toBe('string');
    });
  });

  describe('edge', () => {
    it('returns body unchanged when null', () => {
      expect(convertBodyForCreate(null, 'jira', '3')).toBeNull();
    });

    it('returns body unchanged when not an object', () => {
      expect(convertBodyForCreate('plain', 'jira', '3')).toBe('plain');
    });

    it('leaves non-string description fields alone', () => {
      const input = { description: 123 };
      expect(convertBodyForCreate(input, 'jira', '3')).toEqual(input);
    });

    it('renders nested fields.description for Jira issue create payload', () => {
      const out = convertBodyForCreate(
        { fields: { description: '# H', summary: 'x' } },
        'jira',
        '3',
      ) as { fields: { description: { type: string }; summary: string } };
      expect(out.fields.description.type).toBe('doc');
      expect(out.fields.summary).toBe('x');
    });

    it('renders nested fields.description as wiki for Jira Server', () => {
      const out = convertBodyForCreate(
        { fields: { description: '# H' } },
        'jira',
        '2',
      ) as { fields: { description: string } };
      expect(out.fields.description).toBe('h1. H');
    });

    it('renders Confluence body as storage on apiVersion 2', () => {
      const out = convertBodyForCreate({ body: '# H' }, 'confluence', '2') as {
        body: { storage: { representation: string } };
      };
      expect(out.body.storage.representation).toBe('storage');
    });

    it('does not mutate the input object', () => {
      const input = { description: '# H' };
      convertBodyForCreate(input, 'jira', '3');
      expect(input.description).toBe('# H');
    });
  });
});
