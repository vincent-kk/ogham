/**
 * Orders tasks by ascending numeric priority.
 * @param {{priority: number}} a - left task.
 * @param {{priority: number}} b - right task.
 * @returns {number} negative when a runs first
 */
export function byPriority(a, b) {
  return a.priority - b.priority;
}
