import type { ServerResponse } from 'node:http';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleGetProviderStatus } from '../handleGetProviderStatus.js';

const { checkExecutableRef, getAvailableModelsRef } = vi.hoisted(() => ({
  checkExecutableRef: {
    agy: { available: false } as { available: boolean; version?: string },
    codex: { available: false } as { available: boolean; version?: string },
    claude: { available: false } as { available: boolean; version?: string },
  },
  getAvailableModelsRef: { value: [] as string[] },
}));

vi.mock('../../../../../../lib/checkExecutable.js', () => ({
  checkExecutable: (bin: string) => {
    if (bin === 'agy') return Promise.resolve(checkExecutableRef.agy);
    if (bin === 'codex') return Promise.resolve(checkExecutableRef.codex);
    if (bin === 'claude') return Promise.resolve(checkExecutableRef.claude);
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
    checkExecutableRef.codex = { available: false };
    checkExecutableRef.claude = { available: false };
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

  it('response body contains antigravity, agyModels, codex, and claude keys', async () => {
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as Record<string, unknown>;
    expect(body).toHaveProperty('antigravity');
    expect(body).toHaveProperty('agyModels');
    expect(body).toHaveProperty('codex');
    expect(body).toHaveProperty('claude');
  });

  it('all providers report available:false when no binaries are on PATH', async () => {
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as {
      antigravity: { available: boolean };
      codex: { available: boolean };
      claude: { available: boolean };
    };
    expect(body.antigravity.available).toBe(false);
    expect(body.codex.available).toBe(false);
    expect(body.claude.available).toBe(false);
  });

  it('agyModels is [] when agy is unavailable', async () => {
    checkExecutableRef.agy = { available: false };
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as { agyModels: unknown[] };
    expect(body.agyModels).toEqual([]);
  });

  it('agyModels is populated when agy is available', async () => {
    checkExecutableRef.agy = { available: true, version: '1.0.0' };
    getAvailableModelsRef.value = ['Gemini 3.1 Pro', 'Gemini 3.5 Flash'];
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as { agyModels: string[] };
    expect(body.agyModels).toEqual(['Gemini 3.1 Pro', 'Gemini 3.5 Flash']);
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

  it('claude status reflects available:true with version when claude is found', async () => {
    checkExecutableRef.claude = { available: true, version: '2.1.195' };
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as {
      claude: { available: boolean; version?: string };
    };
    expect(body.claude.available).toBe(true);
    expect(body.claude.version).toBe('2.1.195');
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

  it('version field is absent when a binary has no version string', async () => {
    checkExecutableRef.agy = { available: true };
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as { antigravity: Record<string, unknown> };
    expect(
      Object.prototype.hasOwnProperty.call(body.antigravity, 'version'),
    ).toBe(false);
  });

  it('all three providers can be available simultaneously', async () => {
    checkExecutableRef.agy = { available: true, version: '1.0.0' };
    checkExecutableRef.codex = { available: true, version: '1.0.0' };
    checkExecutableRef.claude = { available: true, version: '1.0.0' };
    getAvailableModelsRef.value = ['model-x'];
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as {
      antigravity: { available: boolean };
      codex: { available: boolean };
      claude: { available: boolean };
      agyModels: string[];
    };
    expect(body.antigravity.available).toBe(true);
    expect(body.codex.available).toBe(true);
    expect(body.claude.available).toBe(true);
    expect(body.agyModels).toEqual(['model-x']);
  });

  it('codex and claude can be available while agy is not', async () => {
    checkExecutableRef.agy = { available: false };
    checkExecutableRef.codex = { available: true, version: '1.0.0' };
    checkExecutableRef.claude = { available: true, version: '1.0.0' };
    const { res, captured } = makeFakeRes();
    await handleGetProviderStatus(res);
    const body = captured.body as {
      antigravity: { available: boolean };
      codex: { available: boolean };
      claude: { available: boolean };
      agyModels: unknown[];
    };
    expect(body.antigravity.available).toBe(false);
    expect(body.codex.available).toBe(true);
    expect(body.claude.available).toBe(true);
    expect(body.agyModels).toEqual([]);
  });
});
