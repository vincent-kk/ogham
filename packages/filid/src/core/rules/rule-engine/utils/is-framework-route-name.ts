import { FRAMEWORK_ROUTE_NAME_PATTERNS } from '../../../../constants/framework-route-patterns.js';

/** Flattened list of every framework's route-segment name patterns. */
const ALL_ROUTE_NAME_PATTERNS = Object.values(
  FRAMEWORK_ROUTE_NAME_PATTERNS,
).flat();

/**
 * Returns true if `name` matches a known framework route-segment naming
 * pattern — Next.js route groups `(app)`, dynamic segments `[id]`, catch-all
 * `[...slug]`, parallel slots `@modal`, intercepting routes `(.)photo`, and
 * private folders `_components`.
 */
export function matchesFrameworkRouteName(name: string): boolean {
  return ALL_ROUTE_NAME_PATTERNS.some((re) => re.test(name));
}
