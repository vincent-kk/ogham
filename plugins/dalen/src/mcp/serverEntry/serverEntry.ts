#!/usr/bin/env node
import { startServer } from "../server/startServer.js";

startServer().catch((error: unknown) => {
  console.error("[dalen] Failed to start MCP server:", error);
  process.exit(1);
});
