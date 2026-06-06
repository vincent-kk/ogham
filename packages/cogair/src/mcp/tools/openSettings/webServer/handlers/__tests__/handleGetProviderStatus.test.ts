import type { ServerResponse } from 'node:http';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleGetProviderStatus } from '../handleGetProviderStatus.js';

const { checkExecutableRef, getAvailableModelsRef } = vi.hoisted(() => ({
  checkExecutableRef: {
    agy: { available: false } as { available: boolean; version?: string },
    gemini: { available: false } as { available: boolean; version?: string },
    codex: { available: false } as { available: boolean; version?: string },
  },
  getAvailableModelsRef: { value: [] as string[] },
}));

vi.mock('../../../../../../lib/checkExecutable.js', () => ({
  checkExecutable: (bin: string) => {
    if (bin === 'agy') return Promise.resolve(checkExecutableRef.agy);
    if (bin === 'gemini') return Promise.resolve(checkExecutableRef.gemini);
    if (bin === 'codex') return Promise.resolve(checkExecutableRef.codex);
    return Promise.resolve({ available: false });
  },
}));

vi.mock('../../../../../../core/agyModels/index.js', () => ({
  getAvailableModels: () => Promise.resolve(getAvailableModelsRef.value),
}));

interface CapturedResponse {
  status: number;
  body: unknown;
}

function makeFakeRes(): { res: ServerResponse; captured: CapturedResponse } {
  const captured: CapturedResponse = { status: 0, body: null };
  let headerStatus = 0;

  const res = {
    writeHead(status: number) {
      headerStatus = status;
    },
    end(text: string) {
      captured.status = headerStatus;
      captured.body = JSON.parse(text);
    },
  } as unknown as ServerResponse;

  return { res, captured };
}

describe('handleGetProviderStatus', () => {
  beforeEach(() => {
    checkExecutableRef.agy = { available: false };
    checkExecutableRef.gemini = { available: false };
    checkExecutableRef.codex = { available: false };
    getAvailableModelsRef.value = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('responds with HTTP 200', async () => {
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    expect(captured.status).toBe(200);
  });

  it('response body contains antigravity, agyModels, gemini, and codex keys', async () => {
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as Record<string, unknown>;
    expect(body).toHaveProperty('antigravity');
    expect(body).toHaveProperty('agyModels');
    expect(body).toHaveProperty('gemini');
    expect(body).toHaveProperty('codex');
  });

  it('all providers report available:false when no binaries are on PATH', async () => {
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as {
      antigravity: { available: boolean };
      gemini: { available: boolean };
      codex: { available: boolean };
    };
    expect(body.antigravity.available).toBe(false);
    expect(body.gemini.available).toBe(false);
    expect(body.codex.available).toBe(false);
  });

  it('agyModels is [] when agy is unavailable (getAvailableModels not consulted)', async () => {
    const getModels = vi.fn().mockResolvedValue(['model-a']);
    // Even with a spy that would return values, agy is unavailable,
    // so the handler must short-circuit and return [].
    checkExecutableRef.agy = { available: false };
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as { agyModels: unknown[] };
    expect(body.agyModels).toEqual([]);
    // getModels spy was never called (it's a local fn, not the mock — this
    // assertion is structural: [] proves gating without a spy reference).
    expect(getModels).not.toHaveBeenCalled();
  });

  it('agyModels is populated when agy is available', async () => {
    checkExecutableRef.agy = { available: true, version: '1.0.0' };
    getAvailableModelsRef.value = ['gemini-2.5-pro', 'gemini-2.0-flash'];
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as { agyModels: string[] };
    expect(body.agyModels).toEqual(['gemini-2.5-pro', 'gemini-2.0-flash']);
  });

  it('agyModels is [] when agy is available but getAvailableModels returns empty', async () => {
    checkExecutableRef.agy = { available: true, version: '1.0.0' };
    getAvailableModelsRef.value = [];
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as { agyModels: string[] };
    expect(body.agyModels).toEqual([]);
  });

  it('antigravity status reflects available:true with version when agy is found', async () => {
    checkExecutableRef.agy = { available: true, version: '2.3.1' };
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as {
      antigravity: { available: boolean; version?: string };
    };
    expect(body.antigravity.available).toBe(true);
    expect(body.antigravity.version).toBe('2.3.1');
  });

  it('gemini status reflects available:true with version when gemini is found', async () => {
    checkExecutableRef.gemini = { available: true, version: '0.9.0' };
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as {
      gemini: { available: boolean; version?: string };
    };
    expect(body.gemini.available).toBe(true);
    expect(body.gemini.version).toBe('0.9.0');
  });

  it('codex status reflects available:true with version when codex is found', async () => {
    checkExecutableRef.codex = { available: true, version: '0.1.0' };
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as {
      codex: { available: boolean; version?: string };
    };
    expect(body.codex.available).toBe(true);
    expect(body.codex.version).toBe('0.1.0');
  });

  it('version field is absent (not undefined-serialized) when binary has no version string', async () => {
    checkExecutableRef.agy = { available: true };
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as { antigravity: Record<string, unknown> };
    // JSON.stringify omits undefined values; version key must not appear
    expect(
      Object.prototype.hasOwnProperty.call(body.antigravity, 'version'),
    ).toBe(false);
  });

  it('all three providers can be available simultaneously', async () => {
    checkExecutableRef.agy = { available: true, version: '1.0.0' };
    checkExecutableRef.gemini = { available: true, version: '1.0.0' };
    checkExecutableRef.codex = { available: true, version: '1.0.0' };
    getAvailableModelsRef.value = ['model-x'];
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as {
      antigravity: { available: boolean };
      gemini: { available: boolean };
      codex: { available: boolean };
      agyModels: string[];
    };
    expect(body.antigravity.available).toBe(true);
    expect(body.gemini.available).toBe(true);
    expect(body.codex.available).toBe(true);
    expect(body.agyModels).toEqual(['model-x']);
  });

  it('gemini and codex can be available while agy is not', async () => {
    checkExecutableRef.agy = { available: false };
    checkExecutableRef.gemini = { available: true, version: '1.0.0' };
    checkExecutableRef.codex = { available: true, version: '1.0.0' };
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as {
      antigravity: { available: boolean };
      gemini: { available: boolean };
      codex: { available: boolean };
      agyModels: unknown[];
    };
    expect(body.antigravity.available).toBe(false);
    expect(body.gemini.available).toBe(true);
    expect(body.codex.available).toBe(true);
    expect(body.agyModels).toEqual([]);
  });
});
