import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

const pluginRoot = fileURLToPath(new URL('../../../', import.meta.url));
const roots: string[] = [];
function run(host: string, hook: string, input: Record<string, unknown>) {
  const bridge = portableJoin(pluginRoot, 'bridge', ...(host === 'codex' ? ['codex'] : []), `${hook}.mjs`);
  const result = spawnSync(process.execPath, [portableJoin(pluginRoot, 'libs/run.cjs'), bridge], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot }, timeout: 8000 });
  expect(result.status, result.stderr).toBe(0);
  return result.stdout;
}
function fixture() {
  const cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-built-')); roots.push(cwd); mkdirSync(portableJoin(cwd, '.git')); mkdirSync(portableJoin(cwd, '.seiri'));
  writeFileSync(portableJoin(cwd, '.seiri/config.json'), '{"intervention":"standard"}');
  return cwd;
}
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

it.each(['claude', 'codex'])('%s bundle contains only its workflow ABI', host => {
  const source = readFileSync(portableJoin(pluginRoot, 'bridge', ...(host === 'codex' ? ['codex'] : []), 'post-tool-use.mjs'), 'utf8');
  expect(source).toContain(host === 'codex' ? '.turn_id' : '.prompt_id');
  expect(source).not.toContain(host === 'codex' ? '.prompt_id' : '.turn_id');
  expect(source).not.toContain(host === 'codex' ? 'mcp__plugin_seiri_tools__workflow' : 'mcp__seiri__workflow');
  expect(Buffer.byteLength(source)).toBeLessThanOrEqual(20 * 1024);
});
it.each(['claude', 'codex'])('%s manifest runtime acknowledges only its native paired lifecycle', host => {
  const cwd = fixture();
  const native = { cwd, session_id: 'session', ...(host === 'codex' ? { turn_id: 'turn' } : { prompt_id: 'turn' }) };
  expect(run(host, 'user-prompt-submit', { ...native, hook_event_name: 'UserPromptSubmit' })).toBe('');
  const input = { ...native, tool_use_id: 'start', tool_name: host === 'codex' ? 'mcp__seiri__workflow' : 'mcp__plugin_seiri_tools__workflow', tool_input: { action: 'start', task: 'test-task', project_root: cwd, intent: 'change' } };
  const content = [{ type: 'text', text: JSON.stringify({ status: 'accepted', action: 'start', task: 'test-task', intent: 'change' }) }];
  expect(run(host, 'pre-tool-use', { ...input, hook_event_name: 'PreToolUse' })).toBe('');
  const post = { ...input, hook_event_name: 'PostToolUse', tool_response: host === 'codex' ? { content } : content };
  expect(run(host, 'post-tool-use', post)).toContain('acknowledged');
  expect(run(host, 'post-tool-use', post)).toBe('');
  expect(run(host, 'user-prompt-submit', { ...native, ...(host === 'codex' ? { turn_id: 'next' } : { prompt_id: 'next' }), hook_event_name: 'UserPromptSubmit' })).toBe('');
  expect(run(host, 'post-tool-use', post)).toBe('');
});
