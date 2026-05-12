import { describe, it, expect } from 'vitest';
import { transformRequest } from '../utils/index.js';

describe('transformRequest', () => {
  describe('basic', () => {
    it('rewrites Confluence DC /pages/{id} → /content/{id}', () => {
      const result = transformRequest('/pages/12345', undefined, 'confluence', 'v1');
      expect(result.endpoint).toBe('/content/12345');
    });

    it('passes Confluence Cloud V2 /pages/{id} through unchanged', () => {
      const result = transformRequest('/pages/12345', undefined, 'confluence', 'v2');
      expect(result.endpoint).toBe('/pages/12345');
    });

    it('passes Jira endpoints through unchanged regardless of apiVersion', () => {
      const a = transformRequest('/issue/PROJ-1', undefined, 'jira', '3');
      const b = transformRequest('/issue/PROJ-1', undefined, 'jira', '2');
      expect(a.endpoint).toBe('/issue/PROJ-1');
      expect(b.endpoint).toBe('/issue/PROJ-1');
    });
  });

  describe('edge', () => {
    it('rewrites POST /pages with body and injects type:page + spaceId→space.key', () => {
      const result = transformRequest(
        '/pages',
        { title: 'X', spaceId: 'DEV' },
        'confluence',
        'v1',
      );
      expect(result.endpoint).toBe('/content');
      expect(result.body).toEqual({ title: 'X', space: { key: 'DEV' }, type: 'page' });
    });

    it('rewrites /pages/{id}/children → /content/{id}/child/page', () => {
      expect(
        transformRequest('/pages/1/children', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/content/1/child/page');
    });

    it('rewrites /pages/{id}/footer-comments → /content/{id}/child/comment', () => {
      expect(
        transformRequest('/pages/1/footer-comments', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/content/1/child/comment');
    });

    it('rewrites /pages/{id}/attachments → /content/{id}/child/attachment', () => {
      expect(
        transformRequest('/pages/1/attachments', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/content/1/child/attachment');
    });

    it('rewrites POST /footer-comments with type:comment injection', () => {
      const result = transformRequest(
        '/footer-comments',
        { body: 'hi' },
        'confluence',
        'v1',
      );
      expect(result.endpoint).toBe('/content');
      expect((result.body as Record<string, unknown>).type).toBe('comment');
    });

    it('rewrites /spaces/{key} → /space/{key}', () => {
      expect(
        transformRequest('/spaces/DEV', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/space/DEV');
    });

    it('throws on V2-only /inline-comments when targeting DC', () => {
      expect(() =>
        transformRequest('/inline-comments', undefined, 'confluence', 'v1'),
      ).toThrow(/Cloud V2 only/);
    });

    it('throws on V2-only /whiteboards on DC', () => {
      expect(() =>
        transformRequest('/whiteboards/abc', undefined, 'confluence', 'v1'),
      ).toThrow(/Cloud V2 only/);
    });

    it('throws on V2-only /databases on DC', () => {
      expect(() =>
        transformRequest('/databases', undefined, 'confluence', 'v1'),
      ).toThrow(/Cloud V2 only/);
    });

    it('throws on V2-only /analytics/* on DC', () => {
      expect(() =>
        transformRequest('/analytics/content/1/views', undefined, 'confluence', 'v1'),
      ).toThrow(/Cloud V2 only/);
    });

    it('passes unknown path through unchanged on DC', () => {
      expect(
        transformRequest('/foo/bar', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/foo/bar');
    });

    it('preserves query string after path mapping', () => {
      expect(
        transformRequest('/pages/1?expand=ancestors', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/content/1?expand=ancestors');
    });

    it('strips status field from V2 body envelope on DC', () => {
      const result = transformRequest(
        '/pages',
        { title: 'X', spaceId: 'DEV', status: 'current' },
        'confluence',
        'v1',
      );
      expect((result.body as Record<string, unknown>).status).toBeUndefined();
    });
  });
});
