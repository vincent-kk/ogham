import { KNOWN_ORGAN_DIR_NAMES } from '../../../constants/organNames.js';
import type {
  CategoryType,
  EntryPointDescriptor,
} from '../../../types/fractal.js';

export { KNOWN_ORGAN_DIR_NAMES };

/** Input for classifyNode */
export interface ClassifyInput {
  /** Directory name */
  dirName: string;
  /** Whether INTENT.md exists */
  hasIntentMd?: boolean;
  /** Whether DETAIL.md exists */
  hasDetailMd?: boolean;
  /** Whether the directory contains fractal child directories */
  hasFractalChildren: boolean;
  /** Whether this is a leaf directory (no subdirectories) */
  isLeafDirectory: boolean;
  /** Whether side effects exist (defaults to true if unspecified) */
  hasSideEffects?: boolean;
  /** Adapter-reported entry points. */
  entryPoints?: readonly EntryPointDescriptor[];
  /** @deprecated Transitional compatibility for pre-adapter callers. */
  hasIndex?: boolean;
  /**
   * Project-declared organ names from `.filid/config.json`
   * (`additional-organ-names`), matched alongside `KNOWN_ORGAN_DIR_NAMES`.
   * Callers without config access (the hook layer) simply omit it.
   */
  additionalOrganNames?: readonly string[];
}

/**
 * Return true for directory names that are always organ by naming convention:
 * - `__name__` (double-underscore wrapped): test/mock/fixture infrastructure
 * - `.name` (dot-prefixed): hidden/tooling directories (e.g. .git, .github, .vscode)
 */
export function isInfraOrgDirectoryByPattern(dirName: string): boolean {
  const isDoubleUnderscore =
    dirName.startsWith('__') && dirName.endsWith('__') && dirName.length > 4;
  const isDotPrefixed = dirName.startsWith('.');
  return isDoubleUnderscore || isDotPrefixed;
}

/**
 * Classify a directory as fractal / organ / pure-function based on structure.
 *
 * Priority order:
 * 1. INTENT.md exists → fractal (explicit declaration)
 * 2. DETAIL.md exists → fractal (documented module boundary)
 * 3. Name matches __*__ or .* pattern → organ (infrastructure convention)
 * 4. Directory name in KNOWN_ORGAN_DIR_NAMES or additionalOrganNames → organ
 *    (name-based, overrides structure)
 * 5. Adapter-reported MODULE INDEX → fractal
 * 6. No fractal children + leaf directory → organ
 * 7. No side effects → pure-function
 * 8. Default → organ
 *
 * Classification describes; it never prescribes. What a node *is* comes from
 * files that exist. What a node *should be* is a rule result — an organ consumed
 * from outside its owner's subtree is reported by `external-import-boundary`,
 * not manufactured here by defaulting to fractal.
 *
 * Step 5 reads `kind: 'module'` only. An `executable` or `framework` entry, and
 * any path injected through config `entryPointOverrides`, does not classify:
 * otherwise markdown-as-implementation such as `SKILL.md` would turn a prose
 * directory into a fractal and subject it to rules written for code.
 */
export function classifyNode(input: ClassifyInput): CategoryType {
  const hasIntent = input.hasIntentMd ?? false;
  const hasDetail = input.hasDetailMd ?? false;

  const isOrganName =
    KNOWN_ORGAN_DIR_NAMES.includes(input.dirName) ||
    (input.additionalOrganNames ?? []).includes(input.dirName);

  const hasModuleIndex =
    (input.entryPoints ?? []).some(
      (entryPoint) => entryPoint.kind === 'module',
    ) ||
    (input.hasIndex ?? false);

  if (hasIntent) return 'fractal';
  if (hasDetail) return 'fractal';
  if (isInfraOrgDirectoryByPattern(input.dirName)) return 'organ';
  if (isOrganName) return 'organ';
  if (hasModuleIndex) return 'fractal';
  if (!input.hasFractalChildren && input.isLeafDirectory) return 'organ';
  const hasSideEffects = input.hasSideEffects ?? true;
  if (!hasSideEffects) return 'pure-function';
  return 'organ';
}
