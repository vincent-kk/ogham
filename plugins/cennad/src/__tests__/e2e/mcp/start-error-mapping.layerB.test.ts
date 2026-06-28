import { rm } from 'node:fs/promises';

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from 'vitest';

import { CENNAD_HOME } from '../../../constants/paths.js';
import type { ErrorCode, Provider } from '../../../types/index.js';
import {
  assertEnvelopeFailure,
  parseToolCallText,
} from '../helpers/envelopeShape.js';
import {
  type ClaudeMode,
  type CodexMode,
  claudeEnv,
  codexEnv,
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
    label: 'claude auth-stderr → auth',
    provider: 'claude',
    env: claudeEnv('auth-stderr' as ClaudeMode),
    code: 'auth',
  },
  {
    label: 'claude rate-limit-stderr → rate_limit',
    provider: 'claude',
    env: claudeEnv('rate-limit-stderr' as ClaudeMode),
    code: 'rate_limit',
  },
  {
    label: 'claude network-stderr → network',
    provider: 'claude',
    env: claudeEnv('network-stderr' as ClaudeMode),
    code: 'network',
  },
  {
    label: 'claude exit-55 → auth',
    provider: 'claude',
    env: claudeEnv('exit-55' as ClaudeMode),
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
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await handle?.close();
  });

  for (const c of cases) {
    it(c.label, async () => {
      handle = await makeLayerBClient({ env: c.env });
      const result = await handle.client.callTool({
        name: 'start_conversation',
        arguments: {
          provider: c.provider,
          prompt: 'trigger failure',
          tier: 'mid',
        },
      });
      assertEnvelopeFailure(parseToolCallText(result.content), {
        code: c.code,
        provider: c.provider,
      });
    });
  }
});
