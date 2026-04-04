/**
 * Two-tier layer filtering: vault config ceiling intersected with per-call tool param.
 */

/**
 * Compute effective layers = intersection(vaultLayers, toolLayerFilter).
 * Falls back to vaultLayers if intersection is empty.
 */
export function computeEffectiveLayers(
  vaultLayers: number[],
  toolLayerFilter?: number[],
): number[] {
  if (!toolLayerFilter || toolLayerFilter.length === 0) return vaultLayers;

  const intersection = toolLayerFilter.filter((l) => vaultLayers.includes(l));
  if (intersection.length === 0) return vaultLayers;
  return intersection;
}

/**
 * Generic post-filter: remove items whose layer is not in effectiveLayers.
 */
export function filterResultsByLayer<T extends { layer?: number }>(
  results: T[],
  effectiveLayers: number[],
): T[] {
  return results.filter((r) => r.layer === undefined || effectiveLayers.includes(r.layer));
}
