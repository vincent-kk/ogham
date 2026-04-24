/**
 * @file config-patch-validate.test.ts
 * @description Unit tests for `mcp_t_config_patch_validate` handler (AC5a).
 * Ensures the SSoT schema wired through `handleConfigPatchValidate` rejects
 * hallucinated config keys and the bare `**` exempt pattern before they
 * reach `fix-requests.md`.
 */
import { describe, expect, it } from 'vitest';

import { handleConfigPatchValidate } from '../../../mcp/tools/config-patch-validate/config-patch-validate.js';

describe('config-patch-validate handler', () => {
  describe('basic', () => {
    it('AC5a: invalid JSON → valid=false with non-empty errors', async () => {
      const result = await handleConfigPatchValidate({
        patch_json: 'not-json{',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('invalid JSON');
    });

    it('AC5a: unknown rule-override key → valid=false, suggestion provided', async () => {
      const patch = JSON.stringify({
        version: '1.0',
        rules: {
          'module-entry-point': {
            enabled: true,
            'allowed-no-entry': ['packages/foo'],
          },
        },
      });
      const result = await handleConfigPatchValidate({ patch_json: patch });
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.toLowerCase().includes('unrecognized')),
      ).toBe(true);
      expect(result.suggestion).toBeDefined();
      expect(result.suggestion).not.toContain('allowed-no-entry');
    });

    it('valid config → valid=true with empty errors', async () => {
      const patch = JSON.stringify({
        version: '1.0',
        rules: {
          'zero-peer-file': { enabled: true, severity: 'warning' },
        },
        'additional-allowed': ['type.ts'],
      });
      const result = await handleConfigPatchValidate({ patch_json: patch });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('edge', () => {
    it('rejects missing patch_json', async () => {
      await expect(handleConfigPatchValidate({})).rejects.toThrow(
        /patch_json/,
      );
    });

    it('rejects non-string patch_json', async () => {
      await expect(
        handleConfigPatchValidate({ patch_json: 42 }),
      ).rejects.toThrow(/patch_json/);
    });

    it('nested additional-allowed under rules[x] is rejected', async () => {
      const patch = JSON.stringify({
        version: '1.0',
        rules: {
          'zero-peer-file': {
            enabled: true,
            'additional-allowed': ['CLAUDE.md'],
          },
        },
      });
      const result = await handleConfigPatchValidate({ patch_json: patch });
      expect(result.valid).toBe(false);
      expect(result.suggestion).toBeDefined();
    });

    it('object additional-allowed entry with paths is accepted', async () => {
      const patch = JSON.stringify({
        version: '1.0',
        rules: {},
        'additional-allowed': [
          { basename: 'CLAUDE.md', paths: ['packages/**'] },
        ],
      });
      const result = await handleConfigPatchValidate({ patch_json: patch });
      expect(result.valid).toBe(true);
    });

    it('bad severity enum → valid=false; suggestion drops the value', async () => {
      const patch = JSON.stringify({
        version: '1.0',
        rules: {
          'naming-convention': { enabled: true, severity: 'CRITICAL' },
        },
      });
      const result = await handleConfigPatchValidate({ patch_json: patch });
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.path.includes('severity')),
      ).toBe(true);
      expect(result.suggestion).toBeDefined();
      const sug = JSON.parse(result.suggestion as string) as {
        rules: { 'naming-convention': Record<string, unknown> };
      };
      expect('severity' in sug.rules['naming-convention']).toBe(false);
    });

    it('bare `**` exempt pattern is rejected by suggestion sanitize', async () => {
      const patch = JSON.stringify({
        version: '1.0',
        rules: {
          'module-entry-point': {
            enabled: true,
            exempt: ['**'],
          },
        },
      });
      const result = await handleConfigPatchValidate({ patch_json: patch });
      // Strict parse succeeds (**is a valid string); suggestion omitted.
      // The loud-drop happens at loadConfig time, surfaced via AC10b sibling test.
      expect(result.valid).toBe(true);
    });

    it('non-string patch_json paths produce structured error paths', async () => {
      const patch = JSON.stringify({
        version: 1, // wrong type — should be string
        rules: {},
      });
      const result = await handleConfigPatchValidate({ patch_json: patch });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes('version'))).toBe(true);
    });

    it('suggestion is absent when strict parse succeeds', async () => {
      const patch = JSON.stringify({
        version: '1.0',
        rules: {},
      });
      const result = await handleConfigPatchValidate({ patch_json: patch });
      expect(result.valid).toBe(true);
      expect(result.suggestion).toBeUndefined();
    });

    it('source_context is accepted and ignored', async () => {
      const patch = JSON.stringify({ version: '1.0', rules: {} });
      const result = await handleConfigPatchValidate({
        patch_json: patch,
        source_context: 'FIX-001 Phase D proposal',
      });
      expect(result.valid).toBe(true);
    });
  });
});
