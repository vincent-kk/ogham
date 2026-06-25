import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServer } from "../lifecycle/createServer.js";

describe("createServer", () => {
  it("constructs an empty MCP server without throwing (Phase 0 smoke)", () => {
    const server = createServer();
    expect(server).toBeInstanceOf(McpServer);
  });
});
