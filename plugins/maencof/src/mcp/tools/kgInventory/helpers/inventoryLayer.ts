import { LAYER_DIR } from '../../../../constants/architecture.js';
import type { Layer } from '../../../../types/common.js';

/** Resolve a scanner-owned path's layer without relying on possibly damaged frontmatter. */
export function inventoryLayer(path: string): Layer {
  return Number(
    Object.entries(LAYER_DIR).find(
      ([, directory]) => directory === path.split('/')[0],
    )![0],
  ) as Layer;
}
