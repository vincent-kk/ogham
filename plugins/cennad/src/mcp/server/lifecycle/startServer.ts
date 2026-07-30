import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadConfig } from '../../../core/configManager/index.js';
import { pruneExpired } from '../../../core/sessionStore/index.js';
import { logger } from '../../../lib/logger.js';

import { createServer } from './createServer.js';

/**
 * 서버를 만들고 만료 세션을 정리한 뒤 stdio transport 에 연결한다.
 *
 * @param version 호스트에 보고할 서버 버전. `createServer` 로 그대로 넘긴다 —
 *   이 fractal 은 `version.ts` 를 읽지 않는다(순환 방지).
 */
export async function startServer(version: string): Promise<void> {
  const server = createServer(version);
  try {
    const config = await loadConfig();
    const removed = await pruneExpired(config.session_ttl_hours);
    if (removed > 0)
      logger.warn('pruned expired sessions on startup', { count: removed });
  } catch (err) {
    logger.warn('session prune failed on startup', {
      error: (err as Error).message,
    });
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
