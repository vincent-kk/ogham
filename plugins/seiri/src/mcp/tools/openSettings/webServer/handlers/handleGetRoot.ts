import type { ServerResponse } from 'node:http';

import {
  ContentType,
  STATE_PLACEHOLDER,
} from '../../../../../constants/http.js';
import type { RouteContext } from '../routing/routeContext.js';
import { escapeJsonForHtml } from '../utils/escapeJsonForHtml.js';

/** Matches the placeholder with either quote style, as authored or minified. */
const STATE_SLOT = new RegExp(`["']${STATE_PLACEHOLDER}["']`);

export function handleGetRoot(ctx: RouteContext, res: ServerResponse): void {
  const html = ctx.settingsHtml.replace(
    STATE_SLOT,
    escapeJsonForHtml(ctx.loadState()),
  );
  res.writeHead(200, {
    'Content-Type': ContentType.HTML,
    'Content-Length': Buffer.byteLength(html),
  });
  res.end(html);
}
