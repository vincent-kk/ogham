import { BUILTIN_RULE_IDS } from '../../../../constants/builtin-rule-ids.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';

import { matchesFrameworkRouteName } from './is-framework-route-name.js';
import { isValidNaming } from './is-valid-naming.js';

/** Compile config-supplied regex strings, skipping any that do not compile. */
function compileRoutePatterns(sources: string[]): RegExp[] {
  const compiled: RegExp[] = [];
  for (const src of sources) {
    try {
      compiled.push(new RegExp(src));
    } catch {
      // Uncompilable patterns are warn-dropped at config load; skip here too.
    }
  }
  return compiled;
}

/**
 * Factory returning the naming-convention check bound to the project's
 * `additional-route-patterns` config. A node name passes when it follows a
 * general casing convention, matches a project-configured route pattern, or
 * — when a framework is detected — matches a framework route-segment name
 * pattern (route group, dynamic segment, parallel slot, etc.).
 */
export function checkNamingConvention(
  additionalRoutePatterns?: string[],
): (context: RuleContext) => RuleViolation[] {
  const configPatterns = compileRoutePatterns(additionalRoutePatterns ?? []);
  return (context: RuleContext): RuleViolation[] => {
    const { node } = context;
    if (isValidNaming(node.name)) return [];

    // Project-configured route patterns apply unconditionally.
    if (configPatterns.some((re) => re.test(node.name))) return [];

    // Framework route-segment names are valid only when a framework is detected.
    const frameworkFiles = node.metadata['frameworkReservedFiles'] as
      | string[]
      | undefined;
    if (
      frameworkFiles &&
      frameworkFiles.length > 0 &&
      matchesFrameworkRouteName(node.name)
    ) {
      return [];
    }

    const frameworkHint =
      frameworkFiles && frameworkFiles.length > 0
        ? ''
        : ` If this is a framework route-segment name (e.g. Next.js \`[id]\`, \`(app)\`), ensure a supported framework package is in your package.json dependencies.`;

    return [
      {
        ruleId: BUILTIN_RULE_IDS.NAMING_CONVENTION,
        severity: 'warning',
        message: `Name "${node.name}" does not follow an accepted naming convention (camelCase, kebab-case, or PascalCase).`,
        path: node.path,
        suggestion: `Rename "${node.name}" to camelCase (default, e.g. myModule), or use kebab-case / PascalCase when the sibling structure or domain convention calls for it.${frameworkHint}`,
      },
    ];
  };
}
