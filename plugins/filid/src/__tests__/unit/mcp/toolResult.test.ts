import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { McpToolName } from '../../../constants/mcpToolNames.js';
import { TOOL_STATUSES } from '../../../constants/toolEnvelope.js';
import { toolResult } from '../../../mcp/server/envelope/toolResult.js';

const PROJECT_ROOT = '/project';
const EMPTY_DIAGNOSTICS: never[] = [];
const SIMPLE_PAYLOAD = {
  projectRoot: PROJECT_ROOT,
  status: TOOL_STATUSES.OK,
  summary: { count: 1 },
  data: { value: 1 },
  diagnostics: EMPTY_DIAGNOSTICS,
};
const MAP_PAYLOAD = {
  projectRoot: PROJECT_ROOT,
  status: TOOL_STATUSES.OK,
  summary: { count: 1 },
  data: { m: new Map([['k', 'v']]) },
  diagnostics: EMPTY_DIAGNOSTICS,
};

describe('toolResult — compact JSON output', () => {
  const original = process.env.FILID_PRETTY_JSON;

  beforeEach(() => {
    delete process.env.FILID_PRETTY_JSON;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.FILID_PRETTY_JSON;
    else process.env.FILID_PRETTY_JSON = original;
  });

  it('should emit JSON without indentation by default', () => {
    const result = toolResult(McpToolName.FRACTAL_INSPECT, SIMPLE_PAYLOAD);
    expect(result.content[0].text).toBe(
      '{"status":"ok","summary":{"count":1},"data":{"value":1},"diagnostics":[]}',
    );
  });

  it('should still convert Map → object via the compact serializer', () => {
    const result = toolResult(McpToolName.FRACTAL_INSPECT, MAP_PAYLOAD);
    expect(JSON.parse(result.content[0].text).data).toEqual({
      m: { k: 'v' },
    });
  });

  it('stays compact when the legacy pretty environment flag is set', () => {
    process.env.FILID_PRETTY_JSON = '1';
    const result = toolResult(McpToolName.FRACTAL_INSPECT, SIMPLE_PAYLOAD);
    expect(result.content[0].text).not.toContain('\n');
  });
});
