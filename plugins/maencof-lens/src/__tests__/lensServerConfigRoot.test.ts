import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { McpToolName } from "../constants/mcpToolNames.js";

type ToolResponse = {
  content: Array<{ type: string; text: string }>;
  isError?: true;
};
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResponse>;

const handlers = new Map<string, ToolHandler>();

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: vi.fn().mockImplementation(function () {
    return {
      registerTool: vi.fn(
        (name: string, _config: unknown, handler: ToolHandler) => {
          handlers.set(name, handler);
        },
      ),
      connect: vi.fn(),
    };
  }),
}));

async function callStatus(configRoot: string | null): Promise<ToolResponse> {
  const { createLensServer } = await import("../mcp/server/server.js");
  createLensServer(configRoot);
  const status = handlers.get(McpToolName.STATUS);
  if (!status) throw new Error("status tool was not registered");
  return status({});
}

describe("createLensServer config root", () => {
  let testDir: string;

  beforeEach(() => {
    handlers.clear();
    testDir = join(tmpdir(), `maencof-lens-root-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // --- Basic (happy path) ---
  it("errors with env guidance when the config root is unresolved", async () => {
    const result = await callStatus(null);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("MAENCOF_LENS_CONFIG_ROOT");
    expect(result.content[0]?.text).not.toContain(
      "No .maencof-lens/config.json",
    );
  });

  it("errors naming the searched root when no config file exists", async () => {
    const result = await callStatus(testDir);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(testDir);
    expect(result.content[0]?.text).toContain("/maencof-lens:setup");
  });
});
