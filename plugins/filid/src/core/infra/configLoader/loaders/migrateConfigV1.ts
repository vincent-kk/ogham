import type { RuleOverride } from '../../../../types/rules.js';

import type { AllowedPeerOverride, FilidConfig } from './configSchemas.js';
import type { ConfigDiagnostic, ConfigMigrationResult } from './configTypes.js';

const REMOVED_RULE_IDS = new Set(['index-barrel-pattern', 'naming-convention']);

function migrateAllowedPeer(value: unknown): AllowedPeerOverride | null {
  if (typeof value === 'string') return { basename: value };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  if (typeof entry.basename !== 'string') return null;
  return {
    basename: entry.basename,
    ...(Array.isArray(entry.paths) &&
    entry.paths.every((path) => typeof path === 'string')
      ? { paths: entry.paths as string[] }
      : {}),
  };
}

function discarded(path: string): ConfigDiagnostic {
  return {
    code: 'config-key-discarded',
    path,
    message: `Removed v1 config key was not migrated: ${path}`,
  };
}

export function migrateConfigV1(
  input: unknown,
  legacyAdapterId: string,
): ConfigMigrationResult {
  const source =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const diagnostics: ConfigDiagnostic[] = [
    {
      code: 'config-migration-required',
      message:
        'Config v1 was converted in memory; save through settings to persist v2.',
    },
  ];
  const sourceRules =
    source.rules &&
    typeof source.rules === 'object' &&
    !Array.isArray(source.rules)
      ? (source.rules as Record<string, unknown>)
      : {};
  const rules: Record<string, RuleOverride> = {};
  for (const [ruleId, override] of Object.entries(sourceRules)) {
    if (REMOVED_RULE_IDS.has(ruleId)) {
      diagnostics.push(discarded(`rules.${ruleId}`));
      continue;
    }
    if (override && typeof override === 'object' && !Array.isArray(override))
      rules[ruleId] = override as RuleOverride;
  }

  const structure: NonNullable<FilidConfig['structure']> = {};
  const scan =
    source.scan &&
    typeof source.scan === 'object' &&
    !Array.isArray(source.scan)
      ? (source.scan as Record<string, unknown>)
      : null;
  if (typeof scan?.maxDepth === 'number') structure.maxDepth = scan.maxDepth;
  if (
    Array.isArray(source['additional-organ-names']) &&
    source['additional-organ-names'].every((name) => typeof name === 'string')
  )
    structure.additionalOrganNames = source[
      'additional-organ-names'
    ] as string[];
  if (Array.isArray(source['additional-allowed'])) {
    const migrated = source['additional-allowed']
      .map(migrateAllowedPeer)
      .filter((entry): entry is AllowedPeerOverride => entry !== null);
    if (migrated.length > 0) structure.additionalAllowedPeers = migrated;
  }
  if (
    Array.isArray(source['additional-entry-points']) &&
    source['additional-entry-points'].every(
      (entry) => typeof entry === 'string',
    )
  )
    structure.entryPointOverrides = {
      [legacyAdapterId]: source['additional-entry-points'] as string[],
    };

  const migratedKeys = new Set([
    'version',
    'language',
    'rules',
    'scan',
    'additional-allowed',
    'additional-entry-points',
    'additional-organ-names',
  ]);
  for (const key of Object.keys(source))
    if (!migratedKeys.has(key)) diagnostics.push(discarded(key));

  return {
    config: {
      version: '2.0',
      ...(typeof source.language === 'string'
        ? { language: source.language }
        : {}),
      adapters: { mode: 'auto', enabled: [legacyAdapterId] },
      rules,
      ...(Object.keys(structure).length > 0 ? { structure } : {}),
    },
    diagnostics,
  };
}
