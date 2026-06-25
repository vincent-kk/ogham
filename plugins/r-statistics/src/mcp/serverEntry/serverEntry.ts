#!/usr/bin/env node
import { startServer } from "../server/index.js";

startServer().catch((error: unknown) => {
  console.error("[r-statistics] Failed to start MCP server:", error);
  process.exit(1);
});
