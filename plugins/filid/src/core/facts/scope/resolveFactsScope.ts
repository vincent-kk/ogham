import { globToRegExp } from '../../../lib/globToRegexp.js';
import type { FilidConfig } from '../../infra/configLoader/index.js';

import { defaultFactsCovers } from './defaultFactsCovers.js';

/**
 * The facts scope in effect for a project (spec §2.3).
 *
 * `declared` is false only when the effective scope covers nothing, which is
 * what makes a project `facts-uninitialized`. An absent `facts.covers` is not
 * that case: the default scope stands in for it, because the server does not
 * write a project's config to create one.
 */
export interface FactsScope {
  /** Whether the effective scope can cover anything at all. */
  declared: boolean;
  /** Whether the patterns came from config or from the built-in default. */
  source: 'config' | 'default';
  /**
   * The provider whose resolutions this project treats as authoritative.
   *
   * Undefined when none is declared, which is what keeps a resolution
   * disagreement judgeable: demoting one to information requires knowing whose
   * answer is supposed to win.
   */
  provider?: string;
  /**
   * Whether one project-relative POSIX path is in scope.
   * @param relativePath Path as `listScannedFilePaths` spells it.
   * @returns True when a `covers` pattern matches and no `excludes` one does.
   */
  covers: (relativePath: string) => boolean;
}

/**
 * Compile the facts scope in effect into a reusable path predicate.
 *
 * `facts.covers` wins when the project declares it. When it does not, the
 * default scope applies rather than nothing — the server never edits a
 * project's config, so treating an absent declaration as "covers nothing" would
 * leave every project that predates facts permanently unanalysable with no
 * in-tool way out.
 *
 * An explicitly empty `covers` is honoured as written: that is a project saying
 * it wants no reference analysis, and it reports as uninitialized.
 *
 * Patterns are the same minimal glob syntax the rest of filid accepts, compiled
 * once here rather than per path, because the predicate runs over every scanned
 * file on every status and submit.
 *
 * @param config Merged project configuration, or undefined when none loaded.
 * @returns The scope, saying which source its patterns came from.
 */
export function resolveFactsScope(config?: FilidConfig): FactsScope {
  const declaredCovers = config?.facts?.covers;
  const source = declaredCovers === undefined ? 'default' : 'config';
  const patterns = declaredCovers ?? defaultFactsCovers();
  const covers = patterns.map(globToRegExp);
  const excludes = (config?.facts?.excludes ?? []).map(globToRegExp);
  const provider = config?.facts?.provider;
  return {
    declared: patterns.length > 0,
    source,
    ...(provider === undefined ? {} : { provider }),
    covers: (relativePath) =>
      covers.some((pattern) => pattern.test(relativePath)) &&
      !excludes.some((pattern) => pattern.test(relativePath)),
  };
}
