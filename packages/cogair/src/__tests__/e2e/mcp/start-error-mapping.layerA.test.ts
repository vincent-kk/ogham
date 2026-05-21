import { rm } from 'node:fs/promises';

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { COGAIR_HOME } from '../../../constants/paths.js';
import type { ErrorCode, Provider } from '../../../types/index.js';
import {
  assertEnvelopeFailure,
  parseToolCallText,
} from '../helpers/envelopeShape.js';
import {
  type CodexMode,
  type GeminiMode,
  codexEnv,
  geminiEnv,
} from '../helpers/fakeProviderScripts.js';
import {
  type FakeProvidersHandle,
  installFakeProviders,
} from '../helpers/installFakeProviders.js';
import {
  type LayerAClient,
  makeLayerAClient,
} from '../helpers/mcpClientLayerA.js';

let fake: FakeProvidersHandle;

beforeAll(() => {
  fake = installFakeProviders();
});

afterAll(() => {
  fake.restore();
});

interface ErrorCase {
  label: string;
  provider: Provider;
  applyEnv: () => void;
  code: ErrorCode;
}

const cases: ErrorCase[] = [
  {
    label: 'gemini auth-stderr → auth',
    provider: 'gemini',
    applyEnv: () =>
      Object.assign(process.env, geminiEnv('auth-stderr' as GeminiMode)),
    code: 'auth',
  },
  {
    label: 'gemini rate-limit-stderr → rate_limit',
    provider: 'gemini',
    applyEnv: () =>
      Object.assign(process.env, geminiEnv('rate-limit-stderr' as GeminiMode)),
    code: 'rate_limit',
  },
  {
    label: 'gemini network-stderr → network',
    provider: 'gemini',
    applyEnv: () =>
      Object.assign(process.env, geminiEnv('network-stderr' as GeminiMode)),
    code: 'network',
  },
  {
    label: 'gemini exit-55 → auth',
    provider: 'gemini',
    applyEnv: () =>
      Object.assign(process.env, geminiEnv('exit-55' as GeminiMode)),
    code: 'auth',
  },
  {
    label: 'codex exit-127 → cli_error',
    provider: 'codex',
    applyEnv: () =>
      Object.assign(process.env, codexEnv('exit-127' as CodexMode)),
    code: 'cli_error',
  },
  {
    label: 'codex exit-53 → budget_exhausted',
    provider: 'codex',
    applyEnv: () =>
      Object.assign(process.env, codexEnv('exit-53' as CodexMode)),
    code: 'budget_exhausted',
  },
];

describe('start_conversation error mapping (Layer A)', () => {
  let handle: LayerAClient;

  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
    handle = await makeLayerAClient();
  });

  afterEach(async () => {
    await handle.close();
  });

  for (const c of cases) {
    it(c.label, async () => {
      c.applyEnv();
      const result = await handle.client.callTool({
        name: 'start_conversation',
        arguments: { provider: c.provider, prompt: 'trigger failure' },
      });
      assertEnvelopeFailure(parseToolCallText(result.content), {
        code: c.code,
        provider: c.provider,
      });
    });
  }
});
