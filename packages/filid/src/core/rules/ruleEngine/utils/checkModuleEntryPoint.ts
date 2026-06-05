import { FRAMEWORK_ENTRY_FILES } from '../../../../constants/allowedPeerFiles.js';
import { BUILTIN_RULE_IDS } from '../../../../constants/builtinRuleIds.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';

/** Flattened set of every known framework's entry-point filenames. */
const ALL_FRAMEWORK_ENTRY_FILES = new Set(
  Object.values(FRAMEWORK_ENTRY_FILES).flat(),
);

/**
 * Factory returning the module-entry-point check bound to the project's
 * `additional-entry-points` config. A fractal/hybrid node satisfies the rule
 * when it has a barrel/executable entry (`index.*`/`main.*`), a
 * framework-invoked entry file (`page.*`/`route.*`, recognised only when a
 * framework is detected), or a project-configured entry file. Nodes with no
 * entry of any kind still warn — a fractal without a public entry point.
 */
export function checkModuleEntryPoint(
  additionalEntryPoints?: string[],
): (context: RuleContext) => RuleViolation[] {
  const configuredEntryFiles = new Set(additionalEntryPoints ?? []);
  return (context: RuleContext): RuleViolation[] => {
    const { node } = context;
    if (node.type !== 'fractal' && node.type !== 'hybrid') return [];
    if (node.hasIndex || node.hasMain) return [];

    // TODO: `peerFiles` and `frameworkReservedFiles` are cast here because
    // `FractalNode.metadata` is typed as `Record<string, unknown>`. Once
    // `FractalNode.metadata` declares these keys explicitly (or a metadata-key
    // constant is introduced), these `as` casts can be removed.
    const peerFiles = node.metadata['peerFiles'] as string[] | undefined;
    if (peerFiles && peerFiles.length > 0) {
      // Project-configured entry files apply unconditionally.
      if (peerFiles.some((f) => configuredEntryFiles.has(f))) return [];
      // Framework entry files count only when a framework was detected.
      const frameworkFiles = node.metadata['frameworkReservedFiles'] as
        | string[]
        | undefined;
      if (
        frameworkFiles &&
        frameworkFiles.length > 0 &&
        peerFiles.some((f) => ALL_FRAMEWORK_ENTRY_FILES.has(f))
      ) {
        return [];
      }
    }

    return [
      {
        ruleId: BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
        severity: 'warning',
        message: `Fractal module "${node.name}" does not have an entry point (index.ts or main.ts).`,
        path: node.path,
        suggestion:
          'Create index.ts or main.ts and define the public API of the module there.',
      },
    ];
  };
}
