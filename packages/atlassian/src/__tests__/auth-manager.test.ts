import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildAuthHeader } from '../utils/index.js';
import { loadCredentials, saveCredentials } from '../core/auth-manager/index.js';
import type { ServiceCredentials } from '../types/index.js';

const TEST_DIR = join(tmpdir(), 'atlassian-test-auth-' + Date.now());
const CRED_PATH = join(TEST_DIR, 'credentials.json');

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe('credential-store (plain JSON)', () => {
  it('saves and reads plain JSON credentials', async () => {
    const data = { jira: { basic: { api_token: 'test-token' } } };
    await saveCredentials(data, CRED_PATH);
    const loaded = await loadCredentials(CRED_PATH);
    expect(loaded).toEqual(data);
  });

  it('produces human-readable JSON file', async () => {
    const { readFile } = await import('node:fs/promises');
    const data = { jira: { basic: { api_token: 'readable' } } };
    await saveCredentials(data, CRED_PATH);
    const raw = await readFile(CRED_PATH, 'utf-8');
    expect(JSON.parse(raw)).toEqual(data);
    expect(raw).toContain('"api_token": "readable"');
  });

});

describe('auth-manager', () => {
  describe('loadCredentials / saveCredentials', () => {
    it('returns empty object when file does not exist', async () => {
      const creds = await loadCredentials(join(TEST_DIR, 'missing.json'));
      expect(creds).toEqual({});
    });

    it('saves and loads credentials round-trip', async () => {
      const credentials = {
        jira: {
          basic: { api_token: 'ATATT3x-test-token' },
        },
      };
      await saveCredentials(credentials, CRED_PATH);
      const loaded = await loadCredentials(CRED_PATH);
      expect(loaded).toEqual(credentials);
    });
  });

  describe('buildAuthHeader', () => {
    it('builds basic auth header', () => {
      const creds: ServiceCredentials = {
        basic: { api_token: 'my-token' },
      };
      const result = buildAuthHeader(creds, 'user@test.com');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('basic');
      const decoded = Buffer.from(result!.value.replace('Basic ', ''), 'base64').toString();
      expect(decoded).toBe('user@test.com:my-token');
    });

    it('returns null when credentials are missing', () => {
      const result = buildAuthHeader({}, 'user@test.com');
      expect(result).toBeNull();
    });

    it('returns null for basic auth without username', () => {
      const creds: ServiceCredentials = {
        basic: { api_token: 'my-token' },
      };
      const result = buildAuthHeader(creds);
      expect(result).toBeNull();
    });

    it('uses password when api_token is absent', () => {
      const creds: ServiceCredentials = {
        basic: { password: 'my-password' },
      };
      const result = buildAuthHeader(creds, 'user@test.com');
      expect(result).not.toBeNull();
      const decoded = Buffer.from(result!.value.replace('Basic ', ''), 'base64').toString();
      expect(decoded).toBe('user@test.com:my-password');
    });
  });
});
