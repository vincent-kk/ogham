import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

import { portableResolve } from '@ogham/cross-platform/compat/resolve';
import { bench, describe } from 'vitest';

const DIST_DIR = portableResolve(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'dist',
);
const BENCH_WORKSPACE = portableResolve(process.cwd(), 'workspace');
const HOOK_EVENT_NAME = Object.freeze({
  USER_PROMPT_SUBMIT: 'UserPromptSubmit',
  PRE_TOOL_USE: 'PreToolUse',
});
const HOOK_BUNDLE_NAME = Object.freeze({
  USER_PROMPT_SUBMIT: 'user-prompt-submit.mjs',
  PRE_TOOL_USE: 'pre-tool-use.mjs',
});
const HOOK_SPAWN_TIMEOUT_MS = 5_000;
const BENCHMARK_TIME_MS = 2_000;

const HOOK_SCRIPTS = {
  userPromptSubmit: portableResolve(
    DIST_DIR,
    'hooks',
    HOOK_BUNDLE_NAME.USER_PROMPT_SUBMIT,
  ),
  preToolUse: portableResolve(DIST_DIR, 'hooks', HOOK_BUNDLE_NAME.PRE_TOOL_USE),
};

const USER_PROMPT_INPUT = JSON.stringify({
  cwd: BENCH_WORKSPACE,
  session_id: 'bench-session',
  hook_event_name: HOOK_EVENT_NAME.USER_PROMPT_SUBMIT,
  prompt: 'Fix the bug',
});

const PRE_TOOL_INPUT = JSON.stringify({
  cwd: BENCH_WORKSPACE,
  session_id: 'bench-session',
  hook_event_name: HOOK_EVENT_NAME.PRE_TOOL_USE,
  tool_name: 'Write',
  tool_input: {
    file_path: portableResolve(BENCH_WORKSPACE, 'INTENT.md'),
    content: Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join('\n'),
  },
});

async function spawnHook(scriptPath: string, stdinData: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      timeout: HOOK_SPAWN_TIMEOUT_MS,
    });
    child.stdin?.write(stdinData);
    child.stdin?.end();
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`hook exited with code ${code}`));
    });
  });
}

// 빌드된 스크립트가 존재하는 경우에만 벤치마크 실행
const scriptsExist = Object.values(HOOK_SCRIPTS).every((p) => existsSync(p));

if (scriptsExist)
  describe('hook-spawn: end-to-end process spawn', () => {
    bench(
      'user-prompt-submit spawn',
      async () => {
        await spawnHook(HOOK_SCRIPTS.userPromptSubmit, USER_PROMPT_INPUT);
      },
      { time: BENCHMARK_TIME_MS },
    );

    bench(
      'pre-tool-use spawn',
      async () => {
        await spawnHook(HOOK_SCRIPTS.preToolUse, PRE_TOOL_INPUT);
      },
      { time: BENCHMARK_TIME_MS },
    );
  });
else
  describe('hook-spawn: end-to-end process spawn', () => {
    bench('(skipped: build dist/ first with `yarn build`)', () => {
      // 빌드된 스크립트가 없으면 스킵
    });
  });
