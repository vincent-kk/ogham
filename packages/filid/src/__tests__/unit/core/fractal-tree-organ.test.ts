import { describe, expect, it } from 'vitest';

import {
  type NodeEntry,
  buildFractalTree,
  getFractalsUnderOrgans,
} from '../../../core/fractal-tree.js';
import type { CategoryType } from '../../../types/fractal.js';

const entry = (
  path: string,
  type: CategoryType,
  hasIntentMd = false,
  hasDetailMd = false,
): NodeEntry => ({
  path,
  name: path.split('/').pop()!,
  type,
  hasIntentMd,
  hasDetailMd,
});

describe('fractal-tree', () => {
  describe('getFractalsUnderOrgans', () => {
    it('should find fractal nested inside a single organ', () => {
      const entries: NodeEntry[] = [
        entry('/app', 'fractal', true),
        entry('/app/components', 'organ'),
        entry('/app/components/Modal', 'fractal'),
      ];
      const tree = buildFractalTree(entries);
      const result = getFractalsUnderOrgans(tree, '/app');
      expect(result.map((n) => n.path)).toContain('/app/components/Modal');
    });

    it('should find fractal nested inside organ > organ chain', () => {
      const entries: NodeEntry[] = [
        entry('/app', 'fractal', true),
        entry('/app/components', 'organ'),
        entry('/app/components/location', 'organ'),
        entry('/app/components/location/FindLocationModal', 'fractal'),
      ];
      const tree = buildFractalTree(entries);
      const result = getFractalsUnderOrgans(tree, '/app');
      expect(result.map((n) => n.path)).toContain(
        '/app/components/location/FindLocationModal',
      );
    });

    it('should return empty array when organ contains only organs (no fractal)', () => {
      const entries: NodeEntry[] = [
        entry('/app', 'fractal', true),
        entry('/app/components', 'organ'),
        entry('/app/components/utils', 'organ'),
      ];
      const tree = buildFractalTree(entries);
      const result = getFractalsUnderOrgans(tree, '/app');
      expect(result).toHaveLength(0);
    });

    it('should find fractals at multiple organ nesting levels', () => {
      const entries: NodeEntry[] = [
        entry('/app', 'fractal', true),
        entry('/app/components', 'organ'),
        entry('/app/components/Modal', 'fractal'),
        entry('/app/components/location', 'organ'),
        entry('/app/components/location/FindLocationModal', 'fractal'),
      ];
      const tree = buildFractalTree(entries);
      const result = getFractalsUnderOrgans(tree, '/app');
      const paths = result.map((n) => n.path);
      expect(paths).toContain('/app/components/Modal');
      expect(paths).toContain('/app/components/location/FindLocationModal');
    });

    it('should find fractals in organ-inside-fractal-inside-organ pattern', () => {
      // organ > fractal > organ > fractal
      const entries: NodeEntry[] = [
        entry('/app', 'fractal', true),
        entry('/app/components', 'organ'),
        entry('/app/components/location', 'fractal'),
        entry('/app/components/location/hooks', 'organ'),
        entry('/app/components/location/FindLocationModal', 'fractal'),
      ];
      const tree = buildFractalTree(entries);
      const result = getFractalsUnderOrgans(tree, '/app');
      const paths = result.map((n) => n.path);
      expect(paths).toContain('/app/components/location');
      expect(paths).toContain('/app/components/location/FindLocationModal');
    });

    it('should not return duplicate nodes (dedup via visited set)', () => {
      // organ > fractal(location) > organ(hooks) > fractal(FindLocationModal)
      // FindLocationModal must appear exactly once
      const entries: NodeEntry[] = [
        entry('/app', 'fractal', true),
        entry('/app/components', 'organ'),
        entry('/app/components/location', 'fractal'),
        entry('/app/components/location/hooks', 'organ'),
        entry('/app/components/location/FindLocationModal', 'fractal'),
      ];
      const tree = buildFractalTree(entries);
      const result = getFractalsUnderOrgans(tree, '/app');
      const paths = result.map((n) => n.path);
      const count = paths.filter((p) => p.includes('FindLocationModal')).length;
      expect(count).toBe(1);
    });

    it('should return empty array for non-existent path', () => {
      const entries: NodeEntry[] = [entry('/app', 'fractal', true)];
      const tree = buildFractalTree(entries);
      expect(getFractalsUnderOrgans(tree, '/nonexistent')).toHaveLength(0);
    });

    it('should return empty array when node has no organs', () => {
      const entries: NodeEntry[] = [
        entry('/app', 'fractal', true),
        entry('/app/auth', 'fractal', true),
      ];
      const tree = buildFractalTree(entries);
      expect(getFractalsUnderOrgans(tree, '/app')).toHaveLength(0);
    });
  });
});
