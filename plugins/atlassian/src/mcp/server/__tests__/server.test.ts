// filid:contract AC-registration
import { beforeEach, describe, expect, it, vi } from "vitest";

const { registerTool } = vi.hoisted(() => ({ registerTool: vi.fn() }));

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class {
    registerTool = registerTool;
  },
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: class {},
}));

import { McpToolName } from "../../../constants/mcpToolNames.js";
import { createServer } from "../server.js";

describe("createServer", () => {
  beforeEach(() => registerTool.mockClear());

  it("marks profile saving as destructive and non-idempotent", () => {
    createServer();

    const registration = registerTool.mock.calls.find(
      ([toolName]) => toolName === McpToolName.COMMENT_THREAD,
    );

    expect(registration?.[1].annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
    });
  });
});
