#!/usr/bin/env node
import { VERSION } from '../../version.js';
import { startServer } from '../server/index.js';

// 서버 identity 주입 지점 — `mcp/server` 는 `version.ts` 를 읽지 않는다.
startServer(VERSION).catch((error) => {
  console.error('[cennad] Failed to start MCP server:', error);
  process.exit(1);
});
