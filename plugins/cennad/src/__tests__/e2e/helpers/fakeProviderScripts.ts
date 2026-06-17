export const GEMINI_FAKE_SCRIPT = `#!/usr/bin/env node
const args = process.argv.slice(2);
const mode = process.env.CENNAD_FAKE_GEMINI_MODE || 'success';
const uuid = process.env.CENNAD_FAKE_GEMINI_UUID || '11111111-2222-3333-4444-555566667777';
const index = process.env.CENNAD_FAKE_GEMINI_INDEX || '1';

if (args.includes('--list-sessions')) {
  const listMode = process.env.CENNAD_FAKE_GEMINI_LIST_MODE || 'present';
  if (listMode === 'empty') process.exit(0);
  if (listMode === 'fail') {
    process.stderr.write('list failed\\n');
    process.exit(1);
  }
  process.stdout.write('  ' + index + '. Test session (2026-01-01 12:00:00) [' + uuid + ']\\n');
  process.exit(0);
}

if (mode === 'success') {
  process.stdout.write('fake gemini response\\n');
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

export type GeminiMode =
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

export interface GeminiEnvOptions {
  uuid?: string;
  index?: string;
  listMode?: 'present' | 'empty' | 'fail';
}

export function geminiEnv(
  mode: GeminiMode,
  opts: GeminiEnvOptions = {},
): Record<string, string> {
  const env: Record<string, string> = { CENNAD_FAKE_GEMINI_MODE: mode };
  if (opts.uuid) env.CENNAD_FAKE_GEMINI_UUID = opts.uuid;
  if (opts.index) env.CENNAD_FAKE_GEMINI_INDEX = opts.index;
  if (opts.listMode) env.CENNAD_FAKE_GEMINI_LIST_MODE = opts.listMode;
  return env;
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
