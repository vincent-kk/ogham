import { describe, it, expect } from 'vitest';
import { SetupFormDataSchema } from '../types/setup.js';

describe('SetupFormDataSchema', () => {
  describe('basic', () => {
    it('rejects cloud deployment when jira.api_version_override is set', () => {
      const result = SetupFormDataSchema.safeParse({
        deployment_type: 'cloud',
        jira: {
          base_url: 'https://example.atlassian.net',
          api_version_override: '2',
        },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual([
          'jira',
          'api_version_override',
        ]);
      }
    });

    it('accepts cloud deployment without api_version_override', () => {
      const result = SetupFormDataSchema.safeParse({
        deployment_type: 'cloud',
        jira: { base_url: 'https://example.atlassian.net' },
      });
      expect(result.success).toBe(true);
    });

    it('accepts on-prem deployment with api_version_override', () => {
      const result = SetupFormDataSchema.safeParse({
        deployment_type: 'onprem',
        jira: {
          base_url: 'https://jira.internal.local',
          api_version_override: '3',
        },
      });
      expect(result.success).toBe(true);
    });
  });
});
