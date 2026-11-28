import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, expect, it } from 'vitest';

import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import { createServer } from '../lifecycle/createServer.js';

let root: string;
let directory: string;
let client: Client;

beforeEach(async () => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'seiri-server-append-')));
  mkdirSync(join(root, '.git'));
  writeConfig(root, 'project', { intervention: 'standard' });
  directory = join(root, '.seiri', 'directives', 'flow');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'focus.md'), 'focus');
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  client = new Client({ name: 'append-test', version: '0.0.0' });
  await client.connect(clientSide);
});
afterEach(async () => {
  await client.close();
  rmSync(root, { recursive: true, force: true });
});

/** Call the runtime tool with directive arguments. */
function callAppend(args: Record<string, unknown>) {
  return client.callTool({
    name: 'runtime',
    arguments: {
      action: 'directives',
      project_root: root,
      directives_op: 'append',
      set: 'flow',
      ...args,
    },
  });
}

it('appends a line stamped by the server clock through the registered schema', async () => {
  const before = Date.now();
  const result = await callAppend({ log: 'notepad', text: 'remember' });
  const after = Date.now();

  expect(result.isError).not.toBe(true);
  const lines = readFileSync(join(directory, 'notepad.jsonl'), 'utf8')
    .trimEnd()
    .split('\n');
  expect(lines).toHaveLength(1);
  const entry: { at: string; text: string } = JSON.parse(lines[0] ?? '');
  expect(entry.text).toBe('remember');
  expect(Date.parse(entry.at)).toBeGreaterThanOrEqual(before);
  expect(Date.parse(entry.at)).toBeLessThanOrEqual(after);
});

it('returns a tool error for a log outside the enumeration', async () => {
  const result = await callAppend({ log: 'diary', text: 'x' });
  expect(result.isError).toBe(true);
});
