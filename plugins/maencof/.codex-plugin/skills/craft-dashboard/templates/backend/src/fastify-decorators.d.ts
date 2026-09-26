import 'fastify';

import type { BodyCache } from './body-cache.js';
import type { RuntimeSpec } from './config.js';
import type { GraphStore } from './graph-store.js';
import type { SearchService } from './search-service.js';
import type { Broadcaster } from './services/broadcaster.js';

declare module 'fastify' {
  interface FastifyInstance {
    graphStore: GraphStore;
    bodyCache: BodyCache;
    search: SearchService;
    broadcaster: Broadcaster;
    spec: RuntimeSpec;
  }
}
