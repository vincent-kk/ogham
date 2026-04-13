import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { encrypt, decrypt, getEncryptionKey } from '../core/auth-manager/credential-store.js';
import { loadCredentials, saveCredentials, buildAuthHeader } from '../core/auth-manager/index.js';
import type { ServiceCredentials } from '../types/index.js';

const TEST_DIR = join(tmpdir(), 'atlassian-test-auth-' + Date.now());
const CRED_PATH = join(TEST_DIR, 'credentials.enc');

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe('credential-store', () => {
  it('encrypts and decrypts data round-trip', () => {
    const key = getEncryptionKey();
    const plaintext = '{"token": "secret-value"}';
    const encrypted = encrypt(plaintext, key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertext for same plaintext (random IV)', () => {
    const key = getEncryptionKey();
    const plaintext = 'same data';
    const a = encrypt(plaintext, key);
    const b = encrypt(plaintext, key);
    expect(a.equals(b)).toBe(false);
  });

  it('fails to decrypt with wrong key', () => {
    const key = getEncryptionKey();
    const wrongKey = Buffer.alloc(32, 0xff);
    const encrypted = encrypt('secret', key);
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });
});

describe('auth-manager', () => {
  describe('loadCredentials / saveCredentials', () => {
    it('returns empty object when file does not exist', async () => {
      const creds = await loadCredentials(join(TEST_DIR, 'missing.enc'));
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
      const result = buildAuthHeader('basic', creds, 'user@test.com');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('basic');
      const decoded = Buffer.from(result!.value.replace('Basic ', ''), 'base64').toString();
      expect(decoded).toBe('user@test.com:my-token');
    });

    it('builds PAT bearer header', () => {
      const creds: ServiceCredentials = {
        pat: { personal_token: 'NjM2-pat-token' },
      };
      const result = buildAuthHeader('pat', creds);
      expect(result).not.toBeNull();
      expect(result!.value).toBe('Bearer NjM2-pat-token');
    });

    it('builds OAuth bearer header', () => {
      const creds: ServiceCredentials = {
        oauth: {
          client_id: 'abc',
          client_secret: 'secret',
          access_token: 'eyJ-access',
        },
      };
      const result = buildAuthHeader('oauth', creds);
      expect(result).not.toBeNull();
      expect(result!.value).toBe('Bearer eyJ-access');
    });

    it('returns null when credentials are missing', () => {
      const result = buildAuthHeader('basic', {}, 'user@test.com');
      expect(result).toBeNull();
    });

    it('returns null for basic auth without username', () => {
      const creds: ServiceCredentials = {
        basic: { api_token: 'my-token' },
      };
      const result = buildAuthHeader('basic', creds);
      expect(result).toBeNull();
    });
  });
});
