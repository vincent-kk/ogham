import type { ConfigDiagnostic } from './configTypes.js';

/** Lift a v2 layer to v3 without interpreting unrelated settings. */
export function migrateConfigV2(
  input: Record<string, unknown>,
): { config: Record<string, unknown>; diagnostics: ConfigDiagnostic[] } {
  if (input.version !== '2.0') return { config: input, diagnostics: [] };
  const config: Record<string, unknown> = { ...input, version: '3.0' };
  const structure = input.structure;
  if (structure && typeof structure === 'object' && !Array.isArray(structure)) {
    const fields = { ...(structure as Record<string, unknown>) };
    const names = fields.additionalExcludedDirectories;
    if (Array.isArray(names) && names.every((name) => typeof name === 'string')) {
      const legacyPatterns = names.map((name: string) => `**/${name}`);
      config.exclude = Array.isArray(input.exclude)
        ? [...input.exclude, ...legacyPatterns]
        : legacyPatterns;
      delete fields.additionalExcludedDirectories;
    }
    config.structure = fields;
  }
  return {
    config,
    diagnostics: [{
      code: 'config-migration-required',
      message: 'Config v2 was converted in memory; save through settings or run project_setup init to persist v3.',
      affects: [],
      nextAction: 'Save through settings or run project_setup action "init" to persist a lossless v3 migration.',
    }],
  };
}
