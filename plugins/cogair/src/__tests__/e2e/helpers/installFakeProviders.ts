import {
  type FakeBinaryHandle,
  installFakeBinary,
} from '../../../dispatcher/__tests__/fakeBinary.js';

import {
  CODEX_FAKE_SCRIPT,
  GEMINI_FAKE_SCRIPT,
} from './fakeProviderScripts.js';

export interface FakeProvidersHandle {
  paths: { gemini: string; codex: string };
  restore: () => void;
}

export function installFakeProviders(): FakeProvidersHandle {
  const gemini: FakeBinaryHandle = installFakeBinary(
    'gemini',
    GEMINI_FAKE_SCRIPT,
  );
  const codex: FakeBinaryHandle = installFakeBinary('codex', CODEX_FAKE_SCRIPT);
  const original = process.env.PATH;
  process.env.PATH = `${gemini.dir}:${codex.dir}:${original ?? ''}`;
  return {
    paths: { gemini: gemini.dir, codex: codex.dir },
    restore: (): void => {
      process.env.PATH = original;
      gemini.cleanup();
      codex.cleanup();
    },
  };
}
