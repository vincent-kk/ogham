import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { tryProjectRoot } from '@ogham/cross-platform';

import { bootSweep } from './bootSweep.js';
import { createServer } from './createServer.js';

/**
 * Connect stdio and schedule cleanup using the host's workspace and wall clock.
 * @returns Resolves after connection and scheduling, without awaiting cleanup;
 * connection failures propagate to the entry point.
 */
export async function startServer(): Promise<void> {
  await createServer().connect(new StdioServerTransport());
  try {
    const root = tryProjectRoot();
    if (root !== null) setImmediate(() => bootSweep(root, Date.now()));
  } catch {
    // Hosts without a startup workspace must not fall back to the plugin cwd.
  }
}
