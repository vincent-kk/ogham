/**
 * @file serverEntry.ts
 * @description esbuild 번들 진입점 — MCP 서버를 stdio 모드로 시작한다.
 *
 * 이 파일은 bridge/mcp-server.cjs 로 번들된다.
 * Claude Code .mcp.json에서 `node bridge/mcp-server.cjs` 로 실행.
 *
 * `--finalize <vaultPath>` 로 스폰되면(registerShutdown 의 detached finalizer)
 * shared runFinalizer 가 bootSweep 을 1회 실행 후 exit 한다 — 서버 미기동.
 * 정상 부팅 시엔 companion-identity 레거시→정본 마이그레이션을 1회 수행한다(멱등).
 * 무거운 1회성 변환은 hook이 아니라 서버 기동 시점에 둔다.
 */
import { runFinalizer } from '@ogham/session-finalizer';

import { runCompanionMigration } from '../../core/companionMigration/index.js';
import { getVaultPath } from '../server/graphCache/index.js';
import { startServer } from '../server/index.js';
import { bootSweep } from '../server/lifecycle/index.js';

// Detached finalizer mode — `node bridge/mcp-server.cjs --finalize <vaultPath>`,
// spawned by registerShutdown to complete the previous session's bootSweep chain
// off the shutdown grace window. runFinalizer runs bootSweep once then exits(0);
// normal boot proceeds only when the flag is absent.
if (!runFinalizer(process.argv, bootSweep)) {
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
