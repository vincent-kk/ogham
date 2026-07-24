import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { bench, describe } from 'vitest';

const DIST_DIR = join(import.meta.dirname, '../../../../..', 'dist');

const HOOK_SCRIPTS = {
  userPromptSubmit: join(DIST_DIR, 'hooks', 'user-prompt-submit.mjs'),
  preToolUse: join(DIST_DIR, 'hooks', 'pre-tool-use.mjs'),
  agentEnforcer: join(DIST_DIR, 'hooks', 'agent-enforcer.mjs'),
};

const USER_PROMPT_INPUT = JSON.stringify({
  cwd: '/workspace',
  session_id: 'bench-session',
  hook_event_name: 'UserPromptSubmit',
  prompt: 'Fix the bug',
});

const PRE_TOOL_INPUT = JSON.stringify({
  cwd: '/workspace',
  session_id: 'bench-session',
  hook_event_name: 'PreToolUse',
  tool_name: 'Write',
  tool_input: {
    file_path: '/workspace/INTENT.md',
    content: Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join('\n'),
  },
});

const SUBAGENT_INPUT = JSON.stringify({
  cwd: '/workspace',
  session_id: 'bench-session',
  hook_event_name: 'SubagentStart',
  agent_type: 'architect',
  agent_id: 'agent-bench-001',
});

async function spawnHook(scriptPath: string, stdinData: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('node', [scriptPath], { timeout: 5000 });
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
      { time: 2000 },
    );

    bench(
      'pre-tool-use spawn',
      async () => {
        await spawnHook(HOOK_SCRIPTS.preToolUse, PRE_TOOL_INPUT);
      },
      { time: 2000 },
    );

    bench(
      'agent-enforcer spawn',
      async () => {
        await spawnHook(HOOK_SCRIPTS.agentEnforcer, SUBAGENT_INPUT);
      },
      { time: 2000 },
    );
  });
else
  describe('hook-spawn: end-to-end process spawn', () => {
    bench('(skipped: build dist/ first with `yarn build`)', () => {
      // 빌드된 스크립트가 없으면 스킵
    });
  });
