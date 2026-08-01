// Route table: one file per resource under routes/, registered here by name.
import { route as orders } from './routes/orders.js';
import { route as users } from './routes/users.js';

export const routes = [users, orders];

/**
 * Finds the route matching a path and runs its handler.
 * @param {string} path - request path such as "/users".
 * @returns {{items: unknown[]}} the handler result
 */
export function resolve(path) {
  const match = routes.find((candidate) => candidate.path === path);
  if (!match) throw new Error(`no route for ${path}`);
  return match.handler();
}
