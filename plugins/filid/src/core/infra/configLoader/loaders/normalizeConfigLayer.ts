import { getDefaultAdapterIds } from '../../../../adapters/index.js';

import type { ConfigDiagnostic } from './configTypes.js';
import { migrateConfigV1 } from './migrateConfigV1.js';
import { migrateConfigV2 } from './migrateConfigV2.js';

/** Migrate and expand recognized shorthand before two partial layers merge. */
export function normalizeConfigLayer(
  document: Record<string, unknown> | null,
  diagnostics: ConfigDiagnostic[],
): Record<string, unknown> | null {
  if (document === null) return null;
  let layer = document;
  if (layer.version === '1.0') {
    const [legacyAdapterId] = getDefaultAdapterIds();
    const migrated = migrateConfigV1(layer, legacyAdapterId!);
    diagnostics.push(...migrated.diagnostics);
    layer = migrated.config as Record<string, unknown>;
  }
  const migrated = migrateConfigV2(layer);
  diagnostics.push(...migrated.diagnostics);
  layer = migrated.config;

  const rules = layer.rules;
  if (rules && typeof rules === 'object' && !Array.isArray(rules)) {
    layer = { ...layer, rules: Object.fromEntries(
      Object.entries(rules).map(([id, value]) => [
        id,
        value === 'off'
          ? { enabled: false }
          : value === 'error' || value === 'warning' || value === 'info'
            ? { severity: value }
            : value,
      ]),
    ) };
  }
  const structure = layer.structure;
  if (structure && typeof structure === 'object' && !Array.isArray(structure)) {
    const fields = structure as Record<string, unknown>;
    const peers = fields.allowedPeers;
    if (Array.isArray(peers))
      layer = { ...layer, structure: {
        ...fields,
        allowedPeers: peers.map((peer: unknown) => {
          if (typeof peer !== 'string' || !peer) return peer;
          const slash = peer.lastIndexOf('/');
          if (slash < 0) return { basename: peer };
          if (slash === 0 || slash === peer.length - 1) return peer;
          return { basename: peer.slice(slash + 1), paths: [peer.slice(0, slash)] };
        }),
      } };
  }
  return layer;
}
