import { describe, it, expect } from 'vitest';
import { attachPrefix } from '../utils/index.js';

describe('attachPrefix', () => {
  describe('basic', () => {
    it('attaches /rest/api/3 prefix for Jira Cloud (v3)', () => {
      expect(attachPrefix('/issue/PROJ-1', 'jira', '3')).toBe('/rest/api/3/issue/PROJ-1');
    });

    it('attaches /rest/api/2 prefix for Jira Server/DC (v2)', () => {
      expect(attachPrefix('/issue/PROJ-1', 'jira', '2')).toBe('/rest/api/2/issue/PROJ-1');
    });

    it('attaches /wiki/api/v2 prefix for Confluence Cloud (v2)', () => {
      expect(attachPrefix('/pages/12345', 'confluence', 'v2')).toBe('/wiki/api/v2/pages/12345');
    });
  });

  describe('edge', () => {
    it('attaches /rest/api prefix for Confluence DC (v1)', () => {
      expect(attachPrefix('/content/12345', 'confluence', 'v1')).toBe('/rest/api/content/12345');
    });

    it('leaves /wiki/rest/api/... path unchanged (Cloud V1 backward compat)', () => {
      const path = '/wiki/rest/api/content/12345';
      expect(attachPrefix(path, 'confluence', 'v2')).toBe(path);
    });

    it('leaves /rest/api/3/... path unchanged (full Jira path backward compat)', () => {
      const path = '/rest/api/3/issue/PROJ-1';
      expect(attachPrefix(path, 'jira', '3')).toBe(path);
    });

    it('leaves /rest/api/content/... path unchanged (full Confluence DC path)', () => {
      const path = '/rest/api/content/12345';
      expect(attachPrefix(path, 'confluence', 'v1')).toBe(path);
    });

    it('normalizes leading slash when missing', () => {
      expect(attachPrefix('issue/PROJ-1', 'jira', '3')).toBe('/rest/api/3/issue/PROJ-1');
    });

    it('preserves query string after attaching prefix', () => {
      expect(attachPrefix('/pages/1?body-format=storage', 'confluence', 'v2'))
        .toBe('/wiki/api/v2/pages/1?body-format=storage');
    });

    it('preserves Jira v2 query string', () => {
      expect(attachPrefix('/search?jql=project=DEV', 'jira', '2'))
        .toBe('/rest/api/2/search?jql=project=DEV');
    });

    it('preserves trailing slash in endpoint', () => {
      expect(attachPrefix('/pages/1/', 'confluence', 'v2')).toBe('/wiki/api/v2/pages/1/');
    });

    it('handles empty endpoint with leading slash', () => {
      expect(attachPrefix('/', 'jira', '3')).toBe('/rest/api/3/');
    });

    it('attaches /wiki/api/v2 prefix to confluence Cloud children endpoint', () => {
      expect(attachPrefix('/pages/1/children', 'confluence', 'v2'))
        .toBe('/wiki/api/v2/pages/1/children');
    });

    it('attaches /rest/api prefix to confluence DC child endpoint', () => {
      expect(attachPrefix('/content/1/child/page', 'confluence', 'v1'))
        .toBe('/rest/api/content/1/child/page');
    });

    it('falls through to endpoint unchanged for unknown service:version pair', () => {
      expect(attachPrefix('/foo', 'jira', 'v1')).toBe('/foo');
    });

    it('preserves /wiki/ prefix for any non-API path (e.g. /wiki/spaces)', () => {
      const path = '/wiki/spaces/DEV';
      expect(attachPrefix(path, 'confluence', 'v2')).toBe(path);
    });
  });
});
