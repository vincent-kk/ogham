import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRIDGE = join(PKG_ROOT, "bridge", "mcp-server.cjs");

const EXPECTED_TOOLS = [
  "auth-check",
  "fetch-fulltext",
  "mesh-lookup",
  "paper-search",
  "paper-search-results",
  "paper-search-start",
  "paper-search-status",
  "setup",
].sort();

describe("@e2e bundled MCP server (build artifact)", () => {
  it.skipIf(!existsSync(BRIDGE))(
    "boots over stdio and registers all tool surfaces",
    async () => {
      const transport = new StdioClientTransport({
        command: "node",
        args: [BRIDGE],
      });
      const client = new Client(
        { name: "entrez-e2e", version: "0.0.0" },
        { capabilities: {} },
      );
      await client.connect(transport);
      try {
        const { tools } = await client.listTools();
        expect(tools.map((t) => t.name).sort()).toEqual(EXPECTED_TOOLS);
        // Every tool advertises an input schema (registration is well-formed).
        expect(tools.every((t) => Boolean(t.inputSchema))).toBe(true);
      } finally {
        await client.close();
      }
    },
    20_000,
  );
});
