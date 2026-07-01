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
    label: 'claude auth-stderr → auth',
    provider: 'claude',
    applyEnv: () =>
      Object.assign(process.env, claudeEnv('auth-stderr' as ClaudeMode)),
    code: 'auth',
  },
  {
    label: 'claude rate-limit-stderr → rate_limit',
    provider: 'claude',
    applyEnv: () =>
      Object.assign(process.env, claudeEnv('rate-limit-stderr' as ClaudeMode)),
    code: 'rate_limit',
  },
  {
    label: 'claude network-stderr → network',
    provider: 'claude',
    applyEnv: () =>
      Object.assign(process.env, claudeEnv('network-stderr' as ClaudeMode)),
    code: 'network',
  },
  {
    label: 'claude exit-55 → auth',
    provider: 'claude',
    applyEnv: () =>
      Object.assign(process.env, claudeEnv('exit-55' as ClaudeMode)),
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
    await rm(CENNAD_HOME, { recursive: true, force: true });
    handle = await makeLayerAClient();
  });

  afterEach(async () => {
    await handle.close();
  });

  for (const c of cases)
    it(c.label, async () => {
      c.applyEnv();
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
});
