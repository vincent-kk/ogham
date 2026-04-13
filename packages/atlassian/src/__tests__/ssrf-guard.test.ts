import { describe, it, expect } from 'vitest';
import { isPrivateIp, validateUrl } from '../core/http-client/ssrf-guard.js';

describe('ssrf-guard', () => {
  describe('isPrivateIp', () => {
    it.each([
      '127.0.0.1',
      '127.0.0.2',
      '10.0.0.1',
      '10.255.255.255',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.0.1',
      '192.168.255.255',
      '169.254.1.1',
      '0.0.0.0',
      '::1',
      'fc00::1',
      'fe80::1',
      '::ffff:127.0.0.1',
      '::ffff:10.0.0.1',
      '::ffff:192.168.1.1',
      '::ffff:169.254.1.1',
    ])('blocks private IP: %s', (ip) => {
      expect(isPrivateIp(ip)).toBe(true);
    });

    it.each([
      '8.8.8.8',
      '1.1.1.1',
      '203.0.113.1',
      '172.32.0.1',
      '172.15.255.255',
      '11.0.0.1',
      '192.169.0.1',
    ])('allows public IP: %s', (ip) => {
      expect(isPrivateIp(ip)).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('rejects path traversal', async () => {
      await expect(
        validateUrl('https://example.atlassian.net/rest/api/../etc/passwd', 'example.atlassian.net'),
      ).rejects.toThrow('SSRF: Path traversal');
    });

    it('rejects hostname mismatch', async () => {
      await expect(
        validateUrl('https://evil.com/rest/api/3/issue', 'example.atlassian.net'),
      ).rejects.toThrow('SSRF: Hostname');
    });

    it('rejects non-http protocols', async () => {
      await expect(
        validateUrl('ftp://example.atlassian.net/file', 'example.atlassian.net'),
      ).rejects.toThrow('SSRF: Invalid protocol');
    });

    it('rejects direct private IP access', async () => {
      await expect(
        validateUrl('https://127.0.0.1/api', '127.0.0.1'),
      ).rejects.toThrow('SSRF: Direct access to private IP');
    });

    it('allows valid public URL with matching hostname', async () => {
      await expect(
        validateUrl('https://mycompany.atlassian.net/rest/api/3/issue/TEST-1', 'mycompany.atlassian.net'),
      ).resolves.toBeUndefined();
    });
  });
});
