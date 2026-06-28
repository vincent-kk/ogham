export const CLAUDE_FAKE_SCRIPT = `#!/usr/bin/env node
const args = process.argv.slice(2);
const mode = process.env.CENNAD_FAKE_CLAUDE_MODE || 'success';
const si = args.indexOf('--session-id');
const ri = args.indexOf('--resume');
const sid = si >= 0 ? args[si + 1] : (ri >= 0 ? args[ri + 1] : 'fake-claude-session');

function emit(obj) { process.stdout.write(JSON.stringify(obj) + '\\n'); }

if (mode === 'success') {
  emit({ type: 'result', subtype: 'success', result: 'fake claude response', session_id: sid });
  process.exit(0);
} else if (mode === 'auth-stderr') {
  process.stderr.write('HTTP 401 Unauthorized\\n');
  process.exit(1);
} else if (mode === 'rate-limit-stderr') {
  process.stderr.write('HTTP 429 Too Many Requests\\n');
  process.exit(1);
} else if (mode === 'network-stderr') {
  process.stderr.write('ECONNRESET\\n');
  process.exit(1);
} else if (mode === 'exit-55') {
  process.exit(55);
} else if (mode === 'exit-53') {
  process.exit(53);
} else {
  process.exit(2);
}
`;

export const CODEX_FAKE_SCRIPT = `#!/usr/bin/env node
const args = process.argv.slice(2);
const mode = process.env.CENNAD_FAKE_CODEX_MODE || 'success';

function emit(obj) { process.stdout.write(JSON.stringify(obj) + '\\n'); }

if (mode === 'success') {
  const isResume = args[1] === 'resume';
  const threadId = isResume ? args[2] : (process.env.CENNAD_FAKE_CODEX_THREAD || 'thread-uuid-fake');
  emit({ type: 'thread.started', thread_id: threadId });
  emit({ type: 'item.completed', item: { type: 'agent_message', text: 'fake codex response' } });
  process.exit(0);
} else if (mode === 'auth-stderr') {
  process.stderr.write('Error: HTTP 401 Unauthorized\\n');
  process.exit(1);
} else if (mode === 'rate-limit-stderr') {
  process.stderr.write('Error: HTTP 429 Too Many Requests\\n');
  process.exit(1);
} else if (mode === 'network-stderr') {
  process.stderr.write('Error: ECONNRESET\\n');
  process.exit(1);
} else if (mode === 'exit-127') {
  process.exit(127);
} else if (mode === 'exit-53') {
  process.exit(53);
} else if (mode === 'no-thread-id') {
  emit({ type: 'item.completed', item: { type: 'agent_message', text: 'no thread' } });
  process.exit(0);
} else {
  process.exit(2);
}
`;

export type ClaudeMode =
  | 'success'
  | 'auth-stderr'
  | 'rate-limit-stderr'
  | 'network-stderr'
  | 'exit-55'
  | 'exit-53';

export type CodexMode =
  | 'success'
  | 'auth-stderr'
  | 'rate-limit-stderr'
  | 'network-stderr'
  | 'exit-127'
  | 'exit-53'
  | 'no-thread-id';

export function claudeEnv(mode: ClaudeMode): Record<string, string> {
  return { CENNAD_FAKE_CLAUDE_MODE: mode };
}

export interface CodexEnvOptions {
  threadId?: string;
}

export function codexEnv(
  mode: CodexMode,
  opts: CodexEnvOptions = {},
): Record<string, string> {
  const env: Record<string, string> = { CENNAD_FAKE_CODEX_MODE: mode };
  if (opts.threadId) env.CENNAD_FAKE_CODEX_THREAD = opts.threadId;
  return env;
}
