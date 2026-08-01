import { byPriority } from './lib/byPriority.js';

/**
 * Produces task names in execution order.
 * @param {{name: string, priority: number}[]} tasks - unsorted tasks; a lower priority number runs first.
 * @returns {string[]} task names in run order
 */
export function schedule(tasks) {
  return [...tasks].sort((a, b) => a.priority - b.priority).map((task) => task.name);
}
