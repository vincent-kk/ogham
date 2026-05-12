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
    it('returns 3 for Jira Cloud', () => {
      expect(getApiVersion('jira', true)).toBe('3');
    });

    it('returns 2 for Jira Server', () => {
      expect(getApiVersion('jira', false)).toBe('2');
    });

    it('respects override for Jira on-prem', () => {
      expect(getApiVersion('jira', false, '3')).toBe('3');
      expect(getApiVersion('jira', false, '2')).toBe('2');
    });

    it('returns v2 for Confluence Cloud', () => {
      expect(getApiVersion('confluence', true)).toBe('v2');
    });

    it('returns v1 for Confluence Server', () => {
      expect(getApiVersion('confluence', false)).toBe('v1');
    });

    it('ignores override for Confluence (DC v1 is single standard)', () => {
      expect(getApiVersion('confluence', false, '3')).toBe('v1');
      expect(getApiVersion('confluence', true, '2')).toBe('v2');
    });
  });
});
