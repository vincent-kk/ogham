import {
  type FakeBinaryHandle,
  installFakeBinary,
} from '../../../dispatcher/__tests__/fakeBinary.js';

import {
  CLAUDE_FAKE_SCRIPT,
  CODEX_FAKE_SCRIPT,
} from './fakeProviderScripts.js';

export interface FakeProvidersHandle {
  paths: { claude: string; codex: string };
  restore: () => void;
}

export function installFakeProviders(): FakeProvidersHandle {
  const claude: FakeBinaryHandle = installFakeBinary(
    'claude',
    CLAUDE_FAKE_SCRIPT,
  );
  const codex: FakeBinaryHandle = installFakeBinary('codex', CODEX_FAKE_SCRIPT);
  const original = process.env.PATH;
  process.env.PATH = `${claude.dir}:${codex.dir}:${original ?? ''}`;
  return {
    paths: { claude: claude.dir, codex: codex.dir },
    restore: (): void => {
      process.env.PATH = original;
      claude.cleanup();
      codex.cleanup();
    },
  };
}
