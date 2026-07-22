/** The settings server binds here and nowhere else. */
export const LOOPBACK_HOST = '127.0.0.1';

/** Settings server routes. The page and the server must agree on these. */
export const Route = {
  ROOT: '/',
  PLAN: '/plan',
  SAVE: '/save',
  CLOSE: '/close',
} as const;

export const HttpMethod = {
  GET: 'GET',
  POST: 'POST',
} as const;

export const ContentType = {
  JSON: 'application/json; charset=utf-8',
  HTML: 'text/html; charset=utf-8',
} as const;

/**
 * Slot in the settings HTML that the server rewrites with page state on
 * every request.
 *
 * Three artifacts have to agree on this string: the page markup that
 * declares the slot, the handler that substitutes it, and the build
 * script that verifies it survived minification. Those last two cannot
 * import this file — one is a browser script, one is a build script — so
 * the wiring test is what holds them together.
 */
export const STATE_PLACEHOLDER = '__SEIRI_STATE__';
