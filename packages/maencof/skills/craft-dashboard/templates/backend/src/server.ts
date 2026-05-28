import { existsSync } from 'node:fs';
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
  await app.register(cors, {
    origin: ['http://127.0.0.1:5173', 'http://localhost:5173'],
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

  await app.listen({ port: spec.port, host: '127.0.0.1' });
  app.log.info(`dashboard ready at http://127.0.0.1:${spec.port}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
