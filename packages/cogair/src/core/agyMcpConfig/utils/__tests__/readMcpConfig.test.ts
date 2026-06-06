import { mkdtempSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readMcpConfig } from '../readMcpConfig.js';

let dir: string;
let configPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cogair-mcp-'));
  configPath = join(dir, 'mcp_config.json');
});

afterEach(() => {
  // OS reaps tmp dirs; nothing persistent to clean.
});

describe('readMcpConfig', () => {
  it('returns empty mcpServers registry when file does not exist', async () => {
    const result = await readMcpConfig(configPath);
    expect(result).toEqual({ mcpServers: {} });
  });

  it('preserves other top-level keys from a valid file', async () => {
    await writeFile(
      configPath,
      JSON.stringify({ version: 2, someKey: 'val', mcpServers: {} }),
    );
    const result = await readMcpConfig(configPath);
    expect(result.version).toBe(2);
    expect(result.someKey).toBe('val');
  });

  it('preserves existing mcpServers entries from a valid file', async () => {
    const servers = { myServer: { command: 'node', args: ['./index.js'] } };
    await writeFile(configPath, JSON.stringify({ mcpServers: servers }));
    const result = await readMcpConfig(configPath);
    expect(result.mcpServers).toEqual(servers);
  });

  it('normalizes missing mcpServers to empty registry', async () => {
    await writeFile(configPath, JSON.stringify({ someKey: 1 }));
    const result = await readMcpConfig(configPath);
    expect(result.mcpServers).toEqual({});
  });

  it('normalizes null mcpServers to empty registry', async () => {
    await writeFile(configPath, JSON.stringify({ mcpServers: null }));
    const result = await readMcpConfig(configPath);
    expect(result.mcpServers).toEqual({});
  });

  it('normalizes array mcpServers to empty registry', async () => {
    await writeFile(configPath, JSON.stringify({ mcpServers: ['a', 'b'] }));
    const result = await readMcpConfig(configPath);
    expect(result.mcpServers).toEqual({});
  });

  it('normalizes string mcpServers to empty registry', async () => {
    await writeFile(
      configPath,
      JSON.stringify({ mcpServers: 'not-an-object' }),
    );
    const result = await readMcpConfig(configPath);
    expect(result.mcpServers).toEqual({});
  });

  it('returns empty mcpServers when top-level JSON is a string', async () => {
    await writeFile(configPath, JSON.stringify('hello'));
    const result = await readMcpConfig(configPath);
    expect(result).toEqual({ mcpServers: {} });
  });

  it('returns empty mcpServers when top-level JSON is an array', async () => {
    await writeFile(configPath, JSON.stringify([1, 2, 3]));
    const result = await readMcpConfig(configPath);
    expect(result).toEqual({ mcpServers: {} });
  });

  it('returns empty mcpServers when top-level JSON is a number', async () => {
    await writeFile(configPath, '42');
    const result = await readMcpConfig(configPath);
    expect(result).toEqual({ mcpServers: {} });
  });

  it('throws on malformed JSON (non-ENOENT errors propagate)', async () => {
    await writeFile(configPath, '{ not valid json');
    await expect(readMcpConfig(configPath)).rejects.toThrow();
  });

  it('rethrows non-ENOENT read errors (e.g. EISDIR on a directory path)', async () => {
    // Reading a directory yields EISDIR on Linux, macOS, and Windows (Node 20/22),
    // a deterministic non-ENOENT error. Nesting under a regular file is ENOTDIR on
    // POSIX but ENOENT on Windows, so it would be swallowed by isFileNotFound there.
    await expect(readMcpConfig(dir)).rejects.toThrow();
  });
});
