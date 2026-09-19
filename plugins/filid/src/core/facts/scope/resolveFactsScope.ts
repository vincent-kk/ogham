import { globToRegExp } from '../../../lib/globToRegexp.js';
import type { FilidConfig } from '../../infra/configLoader/index.js';

/**
 * The declared facts scope of a project (spec §2.3).
 *
 * `declared` is false until `facts.covers` exists, which is what makes the
 * project `facts-uninitialized`: out-of-scope is a positive statement, never an
 * absence read as a pass.
 */
export interface FactsScope {
  /** Whether `facts.covers` is present, so the scope is a declaration. */
  declared: boolean;
  /**
   * Whether one project-relative POSIX path is in scope.
   * @param relativePath Path as `listScannedFilePaths` spells it.
   * @returns True when a `covers` pattern matches and no `excludes` one does.
   */
  covers: (relativePath: string) => boolean;
}

/**
 * Compile the configured facts scope into a reusable path predicate.
 *
 * Patterns are the same minimal glob syntax the rest of filid accepts, compiled
 * once here rather than per path, because the predicate runs over every scanned
 * file on every status and submit.
 *
 * @param config Merged project configuration, or undefined when none loaded.
 * @returns A scope whose `covers` answers false for every path while
 * `facts.covers` is absent.
 */
export function resolveFactsScope(config?: FilidConfig): FactsScope {
  const declaredCovers = config?.facts?.covers;
  if (declaredCovers === undefined)
    return { declared: false, covers: () => false };
  const covers = declaredCovers.map(globToRegExp);
  const excludes = (config?.facts?.excludes ?? []).map(globToRegExp);
  return {
    declared: true,
    covers: (relativePath) =>
      covers.some((pattern) => pattern.test(relativePath)) &&
      !excludes.some((pattern) => pattern.test(relativePath)),
  };
}
