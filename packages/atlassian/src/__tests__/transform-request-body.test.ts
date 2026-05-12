import { describe, it, expect } from 'vitest';
import { transformRequest } from '../utils/index.js';

/** Coverage for body envelope variants on Confluence DC (V2 → V1 mapping). */
describe('transformRequest — body envelope', () => {
  describe('basic', () => {
    it('converts parentId → ancestors array on page create', () => {
      const result = transformRequest(
        '/pages',
        { title: 'X', spaceId: 'DEV', parentId: '99' },
        'confluence',
        'v1',
      );
      expect(result.body).toEqual({
        title: 'X',
        space: { key: 'DEV' },
        ancestors: [{ id: '99' }],
        type: 'page',
      });
    });

    it('converts comment pageId → container on /footer-comments POST', () => {
      const result = transformRequest(
        '/footer-comments',
        { body: 'hi', pageId: '12345' },
        'confluence',
        'v1',
      );
      expect((result.body as Record<string, unknown>).container).toEqual({
        id: '12345',
        type: 'page',
      });
      expect((result.body as Record<string, unknown>).pageId).toBeUndefined();
    });

    it('leaves body envelope untouched on Cloud V2', () => {
      const input = { title: 'X', spaceId: 'DEV', parentId: '99' };
      expect(transformRequest('/pages', input, 'confluence', 'v2').body).toEqual(input);
    });
  });

  describe('edge', () => {
    it('handles numeric parentId by coercing to string', () => {
      const result = transformRequest(
        '/pages',
        { title: 'X', spaceId: 'DEV', parentId: 99 },
        'confluence',
        'v1',
      );
      expect((result.body as Record<string, unknown>).ancestors).toEqual([{ id: '99' }]);
    });

    it('does NOT inject container when contentType is page (not comment)', () => {
      const result = transformRequest(
        '/pages',
        { title: 'X', spaceId: 'DEV', pageId: 'should-not-convert' },
        'confluence',
        'v1',
      );
      // `pageId` is left untouched because the route is `/pages` (contentType: 'page'), not a comment route.
      expect((result.body as Record<string, unknown>).pageId).toBe('should-not-convert');
      expect((result.body as Record<string, unknown>).container).toBeUndefined();
    });

    it('preserves user-provided ancestors when parentId is absent', () => {
      const result = transformRequest(
        '/pages',
        { title: 'X', spaceId: 'DEV', ancestors: [{ id: '5' }] },
        'confluence',
        'v1',
      );
      expect((result.body as Record<string, unknown>).ancestors).toEqual([{ id: '5' }]);
    });

    it('preserves user-provided container when pageId is absent', () => {
      const result = transformRequest(
        '/footer-comments',
        { body: 'hi', container: { id: 'x', type: 'page' } },
        'confluence',
        'v1',
      );
      expect((result.body as Record<string, unknown>).container).toEqual({
        id: 'x',
        type: 'page',
      });
    });

    it('strips status field while keeping ancestors', () => {
      const result = transformRequest(
        '/pages',
        { title: 'X', spaceId: 'DEV', parentId: '99', status: 'current' },
        'confluence',
        'v1',
      );
      expect((result.body as Record<string, unknown>).status).toBeUndefined();
      expect((result.body as Record<string, unknown>).ancestors).toEqual([{ id: '99' }]);
    });

    it('handles parentId without spaceId (e.g., page update)', () => {
      const result = transformRequest(
        '/pages/123',
        { title: 'X', parentId: '99', version: { number: 2 } },
        'confluence',
        'v1',
      );
      const body = result.body as Record<string, unknown>;
      expect(body.ancestors).toEqual([{ id: '99' }]);
      expect(body.space).toBeUndefined();
      expect(body.parentId).toBeUndefined();
    });
  });
});
