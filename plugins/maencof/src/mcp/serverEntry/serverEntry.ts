/**
 * @file serverEntry.ts
 * @description esbuild 번들 진입점 — MCP 서버를 stdio 모드로 시작한다.
 *
 * 이 파일은 bridge/mcp-server.cjs 로 번들된다.
 * Claude Code .mcp.json에서 `node bridge/mcp-server.cjs` 로 실행.
 *
 * 서버 구성 전에 companion-identity 레거시→정본 마이그레이션을 1회 수행한다(멱등).
 * 무거운 1회성 변환은 hook이 아니라 서버 기동 시점에 둔다.
 */
import { runCompanionMigration } from '../../core/companionMigration/index.js';
import { getVaultPath } from '../server/graphCache/index.js';
import { startServer } from '../server/index.js';
import { bootSweep } from '../server/lifecycle/index.js';

// Detached finalizer mode — `node bridge/mcp-server.cjs --finalize <vaultPath>`,
// spawned by registerShutdown to complete the previous session's bootSweep
// chain off the shutdown grace window. Run it once and exit; skip server start.
const finalizeIdx = process.argv.indexOf('--finalize');
if (finalizeIdx !== -1) {
  const vaultPath = process.argv[finalizeIdx + 1];
  if (vaultPath) void bootSweep(vaultPath).finally(() => process.exit(0));
  else process.exit(0);
} else {
  try {
    runCompanionMigration(getVaultPath());
  } catch {
    /* migration is best-effort; a failure must never block server start */
  }

  startServer().catch((err: unknown) => {
    process.stderr.write(`maencof MCP server error: ${String(err)}\n`);
    process.exit(1);
  });
}
