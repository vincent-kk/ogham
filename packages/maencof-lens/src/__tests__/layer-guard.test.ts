import { describe, expect, it } from 'vitest';

import { computeEffectiveLayers, filterResultsByLayer } from '../filter/layer-guard.js';

describe('computeEffectiveLayers', () => {
  it('returns vault layers when no tool filter', () => {
    expect(computeEffectiveLayers([2, 3, 4, 5])).toEqual([2, 3, 4, 5]);
  });

  it('returns intersection of vault and tool layers', () => {
    expect(computeEffectiveLayers([2, 3, 4, 5], [3])).toEqual([3]);
  });

  it('falls back to vault layers on empty intersection', () => {
    expect(computeEffectiveLayers([3, 4], [1, 2])).toEqual([3, 4]);
  });

  it('handles empty tool filter array', () => {
    expect(computeEffectiveLayers([2, 3], [])).toEqual([2, 3]);
  });

  it('returns multiple intersection values', () => {
    expect(computeEffectiveLayers([2, 3, 4, 5], [2, 3])).toEqual([2, 3]);
  });
});

describe('filterResultsByLayer', () => {
  it('keeps items within effective layers', () => {
    const items = [{ layer: 2 }, { layer: 3 }, { layer: 1 }];
    expect(filterResultsByLayer(items, [2, 3])).toEqual([{ layer: 2 }, { layer: 3 }]);
  });

  it('keeps items with undefined layer', () => {
    const items = [{ layer: 2 }, { layer: undefined }, {}];
    expect(filterResultsByLayer(items, [2])).toHaveLength(3);
  });

  it('returns empty array when no items match', () => {
    const items = [{ layer: 1 }];
    expect(filterResultsByLayer(items, [2, 3])).toEqual([]);
  });
});
