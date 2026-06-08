import { describe, expect, it } from 'vitest';

import { loadConfig } from '@/config/index.js';
import { isToolEnabled } from '@/mcp/registry/index.js';
import type { EnableKey, ToolDefinition } from '@/mcp/tools/tool-definition.js';

const fakeTool = (enabledBy: EnableKey): ToolDefinition => ({
  name: 'fake',
  enabledBy,
  register: () => undefined,
});

describe('isToolEnabled', () => {
  it('always enables default tools', () => {
    expect(isToolEnabled(fakeTool('default'), loadConfig({}).enable)).toBe(
      true,
    );
  });

  it('keeps flagged tools off by default', () => {
    expect(isToolEnabled(fakeTool('comments'), loadConfig({}).enable)).toBe(
      false,
    );
  });

  it('enables a flagged tool when its flag is set', () => {
    const enable = loadConfig({ YTDLP_ENABLE_COMMENTS: '1' }).enable;
    expect(isToolEnabled(fakeTool('comments'), enable)).toBe(true);
  });

  it('enables every flagged tool under YTDLP_ENABLE_ALL', () => {
    const enable = loadConfig({ YTDLP_ENABLE_ALL: '1' }).enable;
    expect(isToolEnabled(fakeTool('download'), enable)).toBe(true);
    expect(isToolEnabled(fakeTool('playlist'), enable)).toBe(true);
  });
});
