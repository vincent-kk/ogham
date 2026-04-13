import { describe, it, expect } from 'vitest';
import { resolveEnvironment, getApiVersion } from '../core/environment-resolver/index.js';

describe('environment-resolver', () => {
  describe('resolveEnvironment', () => {
    it('detects Cloud from atlassian.net URL', () => {
      const env = resolveEnvironment('https://mycompany.atlassian.net');
      expect(env.is_cloud).toBe(true);
      expect(env.hostname).toBe('mycompany.atlassian.net');
    });

    it('detects Server from non-atlassian.net URL', () => {
      const env = resolveEnvironment('https://jira.internal.company.com');
      expect(env.is_cloud).toBe(false);
      expect(env.hostname).toBe('jira.internal.company.com');
    });

    it('strips trailing slashes from base_url', () => {
      const env = resolveEnvironment('https://mycompany.atlassian.net///');
      expect(env.base_url).toBe('https://mycompany.atlassian.net');
    });

    it('detects Cloud for Confluence wiki URL', () => {
      const env = resolveEnvironment('https://mycompany.atlassian.net/wiki');
      expect(env.is_cloud).toBe(true);
    });

    it('detects Server for IP-based URL', () => {
      const env = resolveEnvironment('https://192.168.1.100:8080');
      expect(env.is_cloud).toBe(false);
    });
  });

  describe('getApiVersion', () => {
    it('returns 3 for Cloud', () => {
      expect(getApiVersion(true)).toBe('3');
    });

    it('returns 2 for Server', () => {
      expect(getApiVersion(false)).toBe('2');
    });
  });
});
