import { describe, it, expect } from 'vitest';
import { transformRequest } from '../utils/index.js';

/** Coverage for the extended ROUTES table (versions, descendants, move, labels, users, attachments). */
describe('transformRequest — extended routes', () => {
  describe('basic', () => {
    it('rewrites /pages/{id}/versions → /content/{id}/version', () => {
      expect(
        transformRequest('/pages/1/versions', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/content/1/version');
    });

    it('rewrites /pages/{id}/descendants → /content/{id}/descendant/page', () => {
      expect(
        transformRequest('/pages/1/descendants', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/content/1/descendant/page');
    });

    it('rewrites /users/current → /user/current', () => {
      expect(
        transformRequest('/users/current', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/user/current');
    });
  });

  describe('edge', () => {
    it('rewrites /pages/{id}/labels → /content/{id}/label', () => {
      expect(
        transformRequest('/pages/1/labels', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/content/1/label');
    });

    it('rewrites /pages/{id}/move/{position}/{targetId} → /content/...', () => {
      expect(
        transformRequest('/pages/1/move/append/99', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/content/1/move/append/99');
    });

    it('rewrites /attachments/{id} → /content/{id} (DC delete)', () => {
      expect(
        transformRequest('/attachments/att123', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/content/att123');
    });

    it('rewrites /pages/{id}/properties → /content/{id}/property', () => {
      expect(
        transformRequest('/pages/1/properties', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/content/1/property');
    });

    it('passes new V2 endpoints through unchanged on Cloud V2', () => {
      const result = transformRequest('/pages/1/versions', undefined, 'confluence', 'v2');
      expect(result.endpoint).toBe('/pages/1/versions');
    });

    it('preserves query string on /pages/{id}/labels rewrite', () => {
      expect(
        transformRequest('/pages/1/labels?prefix=team-', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/content/1/label?prefix=team-');
    });

    it('preserves query string on /users/current rewrite', () => {
      expect(
        transformRequest('/users/current?expand=details', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/user/current?expand=details');
    });

    it('preserves query string on /pages/{id}/versions rewrite', () => {
      expect(
        transformRequest('/pages/1/versions?limit=5', undefined, 'confluence', 'v1').endpoint,
      ).toBe('/content/1/version?limit=5');
    });
  });
});
