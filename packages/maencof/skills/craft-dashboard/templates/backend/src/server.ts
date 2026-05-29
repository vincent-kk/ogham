import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import Fastify from 'fastify';
import { FastifySSEPlugin as sse } from 'fastify-sse-v2';

import { BodyCache } from './body-cache.js';
import { ensureSpec } from './config.js';
import { GraphStore } from './graph-store.js';
import { mountRoutes } from './routes/index.js';
import { SearchService } from './search-service.js';
import { Broadcaster } from './services/broadcaster.js';
import { VaultWatcher } from './watcher.js';

const HOST = '127.0.0.1';

// Probe a single port without holding it. Resolves false on EADDRINUSE (or any
// bind error), true when the throwaway server bound and closed cleanly.
function isPortFree(port: number): Promise<boolean> {
  return new Promise((res) => {
    const probe = createServer();
    probe.once('error', () => res(false));
    probe.once('listening', () => probe.close(() => res(true)));
    probe.listen(port, HOST);
  });
}

// Find the first free port at or after `preferred`. Lets the dashboard coexist
// with whatever already holds 5174 instead of crashing with EADDRINUSE.
async function findFreePort(preferred: number, maxTries = 20): Promise<number> {
  for (let p = preferred; p < preferred + maxTries; p++) {
    if (await isPortFree(p)) return p;
  }
  throw new Error(
    `no free port in [${preferred}, ${preferred + maxTries}); set PORT to a free range`,
  );
}

// Best-effort browser launch. Detached + error-swallowed so a headless box (no
// desktop / no `open` binary) never crashes the server. Gated by DASHBOARD_OPEN.
function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'cmd'
        : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
  } catch {
    /* no browser available — caller already logged the URL */
  }
}

async function main() {
  const spec = await ensureSpec();
  const broadcaster = new Broadcaster();
  const graphStore = await GraphStore.fromVault(
    spec.vaultPath,
    spec.vaultIndex,
  );
  const bodyCache = new BodyCache(spec.vaultPath, { maxEntries: 256 });
  const search = new SearchService(graphStore, spec.search);
  const watcher = new VaultWatcher(spec.vaultPath, {
    graphStore,
    bodyCache,
    broadcaster,
  });

  const app = Fastify({ logger: { level: 'info' } });
  // 127.0.0.1-only personal tool: accept same-origin (prod static serve sends
  // no Origin) and any localhost dev port (Vite may auto-step past 5173).
  await app.register(cors, {
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow: boolean) => void,
    ) => {
      const ok =
        !origin || /^https?:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin);
      cb(null, ok);
    },
    methods: ['GET'],
  });

  // Live updates (SSE plugin + vault watcher) are wired only when the spec
  // opts in. refresh: 'manual' skips both; the frontend then falls back to
  // TanStack Query refetch. See knowledge/spec-schema.md ("refresh").
  const live = spec.refresh !== 'manual';
  if (live) {
    await app.register(sse);
  }

  app.decorate('graphStore', graphStore);
  app.decorate('bodyCache', bodyCache);
  app.decorate('search', search);
  app.decorate('broadcaster', broadcaster);
  app.decorate('spec', spec);

  mountRoutes(app, spec);

  const modDir = dirname(fileURLToPath(import.meta.url));
  const staticDir = resolve(modDir, '../app/static');
  if (existsSync(staticDir)) {
    await app.register(staticPlugin, { root: staticDir, prefix: '/' });
  }

  app.get('/api/health', async () => ({ ok: true }));

  if (live) {
    await watcher.start();
    app.addHook('onClose', async () => {
      await watcher.stop();
    });
  }

  // spec.port is the PREFERRED port (env PORT > 5174). Bind the first free port
  // at or after it so a busy 5174 steps to 5175, … instead of crashing.
  const port = await findFreePort(spec.port);
  await app.listen({ port, host: HOST });
  const url = `http://${HOST}:${port}/`;

  // Record the actual port next to dashboard-spec.json so tooling (Makefile
  // dev-frontend proxy alignment, the vault run-skill) can discover it.
  const runtimeFile = resolve(modDir, '../..', '.dashboard-runtime.json');
  await writeFile(
    runtimeFile,
    JSON.stringify({ port, url, pid: process.pid }, null, 2),
  );
  app.addHook('onClose', async () => {
    await unlink(runtimeFile).catch(() => {});
  });

  app.log.info(`dashboard ready at ${url}`);
  if (process.env.DASHBOARD_OPEN === '1') openBrowser(url);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
