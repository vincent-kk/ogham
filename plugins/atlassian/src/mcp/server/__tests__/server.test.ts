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
import {
  FetchInputSchema,
  ConvertDirectionSchema,
  AuthCheckInputSchema,
  SetupInputSchema,
} from "../../../types/index.js";
import { createServer } from "../server.js";

describe("createServer", () => {
  beforeEach(() => registerTool.mockClear());

  it.each([
    [McpToolName.FETCH, FetchInputSchema],
    [McpToolName.CONVERT, ConvertDirectionSchema],
    [McpToolName.AUTH_CHECK, AuthCheckInputSchema],
    [McpToolName.SETUP, SetupInputSchema],
  ])("registers the types-owned schema for %s", (name, schema) => {
    createServer();
    const registration = registerTool.mock.calls.find(([toolName]) => toolName === name);
    expect(schema).toBeDefined();
    expect(registration?.[1].inputSchema).toBe(schema);
  });

  it.each([
    [McpToolName.FETCH, { method: "GET", endpoint: "/issue/TEST-1" }, { method: "TRACE" }],
    [McpToolName.CONVERT, { from: "markdown", to: "adf", content: "text" }, { from: "unknown" }],
    [McpToolName.AUTH_CHECK, {}, { connection_test: "true" }],
    [McpToolName.SETUP, {}, { mode: "unknown" }],
  ])("preserves the input contract for %s", (name, valid, invalid) => {
    createServer();
    const registration = registerTool.mock.calls.find(([toolName]) => toolName === name);
    const schema = registration?.[1].inputSchema;
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse(invalid).success).toBe(false);
  });

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
