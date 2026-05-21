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
  type LayerBClient,
  makeLayerBClient,
} from '../helpers/mcpClientLayerB.js';

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
  env: Record<string, string>;
  code: ErrorCode;
}

const cases: ErrorCase[] = [
  {
    label: 'gemini auth-stderr → auth',
    provider: 'gemini',
    env: geminiEnv('auth-stderr' as GeminiMode),
    code: 'auth',
  },
  {
    label: 'gemini rate-limit-stderr → rate_limit',
    provider: 'gemini',
    env: geminiEnv('rate-limit-stderr' as GeminiMode),
    code: 'rate_limit',
  },
  {
    label: 'gemini network-stderr → network',
    provider: 'gemini',
    env: geminiEnv('network-stderr' as GeminiMode),
    code: 'network',
  },
  {
    label: 'gemini exit-55 → auth',
    provider: 'gemini',
    env: geminiEnv('exit-55' as GeminiMode),
    code: 'auth',
  },
  {
    label: 'codex exit-127 → cli_error',
    provider: 'codex',
    env: codexEnv('exit-127' as CodexMode),
    code: 'cli_error',
  },
  {
    label: 'codex exit-53 → budget_exhausted',
    provider: 'codex',
    env: codexEnv('exit-53' as CodexMode),
    code: 'budget_exhausted',
  },
];

describe('start_conversation error mapping (Layer B)', () => {
  let handle: LayerBClient;

  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await handle?.close();
  });

  for (const c of cases) {
    it(c.label, async () => {
      handle = await makeLayerBClient({ env: c.env });
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
