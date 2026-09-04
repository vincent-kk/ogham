import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import {
  listDirectoryIfExistsSync,
  pluginCache,
  portableIsAbsolute,
  portableJoin,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { McpToolName } from '../../../constants/mcpToolNames.js';
import {
  TOOL_ARTIFACT_HASH_ALGORITHM,
  TOOL_ARTIFACT_HASH_ENCODING,
  TOOL_INLINE_BUDGET_BYTES,
  TOOL_MEDIA_TYPES,
  TOOL_PERSISTENCE,
  TOOL_STATUSES,
} from '../../../constants/toolEnvelope.js';
import {
  materializeToolEnvelope,
  writeArtifactAtomic,
} from '../../../core/infra/artifactStore/index.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';
import { toolError } from '../envelope/toolError.js';
import { toolResult } from '../envelope/toolResult.js';

const PROJECT_ROOT = '/project';
const SMALL_DATA = { value: 'small' };
const SUMMARY = { count: 1 };
const DIAGNOSTICS: never[] = [];
const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;
const LARGE_DIAGNOSTIC_CODE = 'large-diagnostic';
const LARGE_DIAGNOSTIC_MESSAGE = 'd'.repeat(TOOL_INLINE_BUDGET_BYTES * 2);
const INLINE_BUDGET_ERROR_MESSAGE =
  'Tool summary and artifact metadata exceed the inline response budget.';
const MAP_ENTRY_KEY = 'key';
const MAP_ENTRY_VALUE = 'value';
const SET_ENTRY_VALUE = 'member';
const ESCAPED_DIRECTORY_NAME = 'escaped-artifacts';
const ARTIFACTS_DIRECTORY_NAME = 'artifacts';
const SYMLINK_DIRECTORY_TYPE = 'junction';

let stateRoot: string;

function payloadFor(
  data: unknown,
  persistence?: ToolPayload<unknown, unknown>['persistence'],
): ToolPayload<typeof SUMMARY, unknown> {
  return {
    projectRoot: PROJECT_ROOT,
    status: TOOL_STATUSES.OK,
    summary: SUMMARY,
    data,
    diagnostics: DIAGNOSTICS,
    ...(persistence ? { persistence } : {}),
  };
}

beforeEach(() => {
  stateRoot = mkdtempSync(portableJoin(tmpdir(), 'filid-tool-envelope-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
});

afterEach(() => {
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CONFIG_DIR;
  rmSync(stateRoot, { recursive: true, force: true });
});

describe('common MCP tool envelope', () => {
  it('keeps small data inline as compact JSON', () => {
    const envelope = materializeToolEnvelope(
      McpToolName.FRACTAL_INSPECT,
      payloadFor(SMALL_DATA),
    );
    expect(envelope.data).toEqual(SMALL_DATA);
    expect(envelope.artifact).toBeUndefined();
    expect(JSON.stringify(envelope)).not.toContain('\n');
  });

  it('omits data and persists an oversized payload', () => {
    const envelope = materializeToolEnvelope(
      McpToolName.FRACTAL_INSPECT,
      payloadFor('x'.repeat(TOOL_INLINE_BUDGET_BYTES)),
    );
    expect(envelope.data).toBeUndefined();
    expect(envelope.artifact).toBeDefined();
  });

  it('always persists a small restructure plan payload', () => {
    const envelope = materializeToolEnvelope(
      McpToolName.RESTRUCTURE,
      payloadFor(SMALL_DATA, TOOL_PERSISTENCE.ALWAYS),
    );
    expect(envelope.data).toBeUndefined();
    expect(envelope.artifact).toBeDefined();
  });

  it('returns an absolute ephemeral JSON artifact path', () => {
    const envelope = materializeToolEnvelope(
      McpToolName.RESTRUCTURE,
      payloadFor(SMALL_DATA, TOOL_PERSISTENCE.ALWAYS),
    );
    expect(portableIsAbsolute(envelope.artifact?.path ?? '')).toBe(true);
    expect(envelope.artifact).toMatchObject({
      mediaType: TOOL_MEDIA_TYPES.JSON,
      ephemeral: true,
    });
  });

  it('writes the complete payload into the artifact', () => {
    const payload = payloadFor(SMALL_DATA, TOOL_PERSISTENCE.ALWAYS);
    const envelope = materializeToolEnvelope(McpToolName.RESTRUCTURE, payload);
    const content = readFileSync(envelope.artifact?.path ?? '', 'utf8');
    expect(JSON.parse(content)).toEqual(payload);
  });

  it('reports artifact bytes from the exact UTF-8 content', () => {
    const envelope = materializeToolEnvelope(
      McpToolName.RESTRUCTURE,
      payloadFor(SMALL_DATA, TOOL_PERSISTENCE.ALWAYS),
    );
    const content = readFileSync(envelope.artifact?.path ?? '', 'utf8');
    expect(envelope.artifact?.bytes).toBe(Buffer.byteLength(content));
  });

  it('reports the SHA-256 of the exact artifact content', () => {
    const envelope = materializeToolEnvelope(
      McpToolName.RESTRUCTURE,
      payloadFor(SMALL_DATA, TOOL_PERSISTENCE.ALWAYS),
    );
    const content = readFileSync(envelope.artifact?.path ?? '', 'utf8');
    expect(envelope.artifact?.sha256).toBe(
      createHash(TOOL_ARTIFACT_HASH_ALGORITHM)
        .update(content)
        .digest(TOOL_ARTIFACT_HASH_ENCODING),
    );
  });

  it('reuses the same content-addressed path for the same payload', () => {
    const first = materializeToolEnvelope(
      McpToolName.RESTRUCTURE,
      payloadFor(SMALL_DATA, TOOL_PERSISTENCE.ALWAYS),
    );
    const second = materializeToolEnvelope(
      McpToolName.RESTRUCTURE,
      payloadFor(SMALL_DATA, TOOL_PERSISTENCE.ALWAYS),
    );
    expect(second.artifact?.path).toBe(first.artifact?.path);
  });

  it('atomically writes an exact target file', () => {
    const target = portableJoin(stateRoot, 'atomic', 'payload.json');
    writeArtifactAtomic(target, '{"ok":true}');
    expect(existsSync(target)).toBe(true);
    expect(readFileSync(target, 'utf8')).toBe('{"ok":true}');
  });

  it('serializes the materialized envelope through toolResult', () => {
    const result = toolResult(
      McpToolName.FRACTAL_INSPECT,
      payloadFor(SMALL_DATA),
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toMatchObject({
      status: TOOL_STATUSES.OK,
      summary: SUMMARY,
      data: SMALL_DATA,
      diagnostics: DIAGNOSTICS,
    });
  });

  it('serializes tool failures as structured diagnostics', () => {
    const result = toolError(new Error('boom'));
    const parsed = JSON.parse(result.content[0].text);
    expect(result.isError).toBe(true);
    expect(parsed.status).toBe(TOOL_STATUSES.UNSUPPORTED);
    expect(parsed.diagnostics[0].message).toBe('boom');
  });

  it('uses the same Map and Set serialization inline and in artifacts', () => {
    const data = {
      map: new Map([[MAP_ENTRY_KEY, MAP_ENTRY_VALUE]]),
      set: new Set([SET_ENTRY_VALUE]),
    };
    const inline = toolResult(McpToolName.FRACTAL_INSPECT, payloadFor(data));
    const persisted = materializeToolEnvelope(
      McpToolName.RESTRUCTURE,
      payloadFor(data, TOOL_PERSISTENCE.ALWAYS),
    );
    const inlineData = JSON.parse(inline.content[0].text).data;
    const artifactData = JSON.parse(
      readFileSync(persisted.artifact?.path ?? '', 'utf8'),
    ).data;

    expect(artifactData).toEqual(inlineData);
    expect(artifactData).toEqual({
      map: { [MAP_ENTRY_KEY]: MAP_ENTRY_VALUE },
      set: [SET_ENTRY_VALUE],
    });
  });

  it('bounds oversized diagnostics in the actual MCP text response', () => {
    const payload = {
      ...payloadFor(SMALL_DATA),
      diagnostics: [
        {
          code: LARGE_DIAGNOSTIC_CODE,
          message: LARGE_DIAGNOSTIC_MESSAGE,
        },
      ],
    };
    const result = toolResult(McpToolName.FRACTAL_INSPECT, payload);
    const parsed = JSON.parse(result.content[0].text);
    const artifactPayload = JSON.parse(
      readFileSync(parsed.artifact.path, 'utf8'),
    );

    expect(
      Buffer.byteLength(result.content[0].text, 'utf8'),
    ).toBeLessThanOrEqual(TOOL_INLINE_BUDGET_BYTES);
    expect(parsed.data).toBeUndefined();
    expect(parsed.diagnostics).not.toEqual(payload.diagnostics);
    expect(artifactPayload.diagnostics).toEqual(payload.diagnostics);
  });

  it('rejects a summary that cannot fit beside artifact metadata', () => {
    const payload = {
      ...payloadFor(SMALL_DATA),
      summary: {
        detail: 's'.repeat(TOOL_INLINE_BUDGET_BYTES * 2),
      },
    };
    const artifactDirectory = portableJoin(
      pluginCache('filid'),
      ARTIFACTS_DIRECTORY_NAME,
      McpToolName.FRACTAL_INSPECT,
    );

    expect(() =>
      materializeToolEnvelope(McpToolName.FRACTAL_INSPECT, payload),
    ).toThrow(INLINE_BUDGET_ERROR_MESSAGE);
    const artifactFiles = listDirectoryIfExistsSync(artifactDirectory);
    expect(artifactFiles).toHaveLength(1);
    expect(
      JSON.parse(
        readFileSync(
          portableJoin(artifactDirectory, artifactFiles[0]!),
          'utf8',
        ),
      ),
    ).toEqual(payload);
  });

  it('rejects artifact writes through a cache symlink descendant', () => {
    const cacheRoot = pluginCache('filid');
    const artifactDirectory = portableJoin(cacheRoot, ARTIFACTS_DIRECTORY_NAME);
    const escapedDirectory = portableJoin(stateRoot, ESCAPED_DIRECTORY_NAME);
    const toolDirectory = portableJoin(
      artifactDirectory,
      McpToolName.RESTRUCTURE,
    );
    mkdirSync(artifactDirectory, { recursive: true });
    mkdirSync(escapedDirectory, { recursive: true });
    symlinkSync(escapedDirectory, toolDirectory, SYMLINK_DIRECTORY_TYPE);

    expect(() =>
      materializeToolEnvelope(
        McpToolName.RESTRUCTURE,
        payloadFor(SMALL_DATA, TOOL_PERSISTENCE.ALWAYS),
      ),
    ).toThrow(/symbolic link/);
    expect(listDirectoryIfExistsSync(escapedDirectory)).toEqual([]);
  });
});
