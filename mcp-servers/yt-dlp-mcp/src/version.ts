import { createRequire } from 'node:module';

// Resolved at runtime from the package manifest. From both dist/version.js and
// src/version.ts the manifest sits one directory up, so the path is stable.
const require = createRequire(import.meta.url);
const manifest = require('../package.json') as { version: string };

export const VERSION: string = manifest.version;
export const SERVER_NAME = 'yt-dlp-mcp';
