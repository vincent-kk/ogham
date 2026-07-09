/**
 * @file types.ts
 * @description cacheManager public types — pinned node record.
 */
export interface PinnedNode {
  id: string;
  title: string;
  layer: number;
  pinnedAt: string;
}
