import { describe, expect, it } from 'vitest';

import { generateSyncPlan } from '../../../core/rules/drift-detector/drift-detector.js';
import type { DriftItem } from '../../../types/drift.js';

describe('drift-detector — generateSyncPlan', () => {
  describe('generateSyncPlan', () => {
    it('should return empty plan for no drifts', () => {
      const plan = generateSyncPlan([]);

      expect(plan.actions).toHaveLength(0);
      expect(plan.estimatedChanges).toBe(0);
    });

    it('should create SyncPlanAction for each DriftItem', () => {
      const drifts: DriftItem[] = [
        {
          path: '/app/utils',
          rule: 'organ-no-intentmd',
          expected: 'No INTENT.md',
          actual: 'Has INTENT.md',
          severity: 'high',
          suggestedAction: 'move',
        },
      ];

      const plan = generateSyncPlan(drifts);

      expect(plan.actions).toHaveLength(1);
      expect(plan.actions[0].action).toBe('move');
      expect(plan.actions[0].source).toBe('/app/utils');
      expect(plan.actions[0].riskLevel).toBe('high');
    });

    it('should set overall riskLevel to highest drift severity', () => {
      const drifts: DriftItem[] = [
        {
          path: '/a',
          rule: 'r1',
          expected: '',
          actual: '',
          severity: 'low',
          suggestedAction: 'rename',
        },
        {
          path: '/b',
          rule: 'r2',
          expected: '',
          actual: '',
          severity: 'critical',
          suggestedAction: 'move',
        },
        {
          path: '/c',
          rule: 'r3',
          expected: '',
          actual: '',
          severity: 'medium',
          suggestedAction: 'create-index',
        },
      ];

      const plan = generateSyncPlan(drifts);

      expect(plan.riskLevel).toBe('critical');
    });

    it('should sort reversible actions before non-reversible at same severity', () => {
      const drifts: DriftItem[] = [
        {
          path: '/a',
          rule: 'r1',
          expected: '',
          actual: '',
          severity: 'high',
          suggestedAction: 'move',
        },
        {
          path: '/b',
          rule: 'r2',
          expected: '',
          actual: '',
          severity: 'high',
          suggestedAction: 'rename',
        },
      ];

      const plan = generateSyncPlan(drifts);

      // rename is reversible, move is not — rename should come first
      expect(plan.actions[0].action).toBe('rename');
      expect(plan.actions[1].action).toBe('move');
    });

    it('should sort by severity (critical first)', () => {
      const drifts: DriftItem[] = [
        {
          path: '/a',
          rule: 'r1',
          expected: '',
          actual: '',
          severity: 'low',
          suggestedAction: 'rename',
        },
        {
          path: '/b',
          rule: 'r2',
          expected: '',
          actual: '',
          severity: 'critical',
          suggestedAction: 'move',
        },
      ];

      const plan = generateSyncPlan(drifts);

      expect(plan.actions[0].riskLevel).toBe('critical');
      expect(plan.actions[1].riskLevel).toBe('low');
    });
  });
});
