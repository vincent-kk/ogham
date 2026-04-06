import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import os from 'node:os';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { StoriesManifestSchema, DevplanManifestSchema } from '../../types/manifest.js';
import { handleRunCreate } from '../../mcp/tools/run-create/run-create.js';
import { handleRunTransition } from '../../mcp/tools/run-transition/run-transition.js';
import { handleManifestSave } from '../../mcp/tools/manifest-save/manifest-save.js';
import { handleManifestValidate } from '../../mcp/tools/manifest-validate/manifest-validate.js';
import { handleManifestGet } from '../../mcp/tools/manifest-get/manifest-get.js';

const require = createRequire(import.meta.url);
const goldenStories = require('./fixtures/golden-stories-manifest.json');
const goldenDevplan = require('./fixtures/golden-devplan-manifest.json');

function makeTmpDir(): string {
  const dir = join(os.tmpdir(), `imbas-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('Pipeline Integration', () => {
  describe('Schema Validation - Stories Manifest', () => {
    it('golden stories manifest passes StoriesManifestSchema.parse()', () => {
      const result = StoriesManifestSchema.parse(goldenStories);
      expect(result.stories).toHaveLength(3);
      expect(result.stories[2]!.split_from).toBe('S-2');
      expect(result.links).toHaveLength(1);
    });

    it('rejects stories manifest missing required field (batch)', () => {
      const { batch: _batch, ...withoutBatch } = goldenStories;
      expect(() => StoriesManifestSchema.parse(withoutBatch)).toThrow();
    });

    it('rejects stories manifest with invalid verification coherence value', () => {
      const bad = {
        ...goldenStories,
        stories: [
          {
            ...goldenStories.stories[0],
            verification: { anchor_link: true, coherence: 'MAYBE', reverse_inference: 'PASS' },
          },
        ],
      };
      expect(() => StoriesManifestSchema.parse(bad)).toThrow();
    });
  });

  describe('Schema Validation - Devplan Manifest', () => {
    it('golden devplan manifest passes DevplanManifestSchema.parse()', () => {
      const result = DevplanManifestSchema.parse(goldenDevplan);
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0]!.blocks).toContain('T-2');
      expect(result.story_subtasks).toHaveLength(1);
      expect(result.feedback_comments).toHaveLength(1);
      expect(result.execution_order).toHaveLength(3);
    });

    it('rejects devplan manifest missing required field (batch)', () => {
      const { batch: _batch, ...withoutBatch } = goldenDevplan;
      expect(() => DevplanManifestSchema.parse(withoutBatch)).toThrow();
    });

    it('rejects devplan manifest with invalid execution_order action', () => {
      const bad = {
        ...goldenDevplan,
        execution_order: [{ step: 1, action: 'invalid_action', items: ['T-1'] }],
      };
      expect(() => DevplanManifestSchema.parse(bad)).toThrow();
    });
  });

  describe('Pipeline Flow - run_create → transition → manifest_save → manifest_validate', () => {
    let tmpDir: string;
    let cwdSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      tmpDir = makeTmpDir();
      cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    });

    afterEach(() => {
      cwdSpy.mockRestore();
    });

    it('full pipeline: create run, start+complete validate, start+complete split with stories manifest, start devplan', async () => {
      const src = join(tmpDir, 'source.md');
      writeFileSync(src, '# Epic source\n');

      const { run_id } = await handleRunCreate({ project_ref: 'ALPHA', source_file: src });

      await handleRunTransition({ project_ref: 'ALPHA', run_id, action: 'start_phase', phase: 'validate' });
      await handleRunTransition({
        project_ref: 'ALPHA',
        run_id,
        action: 'complete_phase',
        phase: 'validate',
        result: 'PASS',
        blocking_issues: 0,
        warning_issues: 0,
      });

      await handleRunTransition({ project_ref: 'ALPHA', run_id, action: 'start_phase', phase: 'split' });

      const manifest = { ...goldenStories, run_id, project_ref: 'ALPHA' };
      const saveResult = await handleManifestSave({ project_ref: 'ALPHA', run_id, type: 'stories', manifest });
      expect(saveResult.path).toContain('stories-manifest.json');
      expect(saveResult.summary.total).toBe(3);

      await handleRunTransition({
        project_ref: 'ALPHA',
        run_id,
        action: 'complete_phase',
        phase: 'split',
        stories_created: 3,
        pending_review: false,
      });

      const afterSplit = await handleRunTransition({
        project_ref: 'ALPHA',
        run_id,
        action: 'start_phase',
        phase: 'devplan',
      });
      expect(afterSplit.phases.devplan.status).toBe('in_progress');
    });

    it('rejects starting split phase when validate not completed', async () => {
      const src = join(tmpDir, 'source.md');
      writeFileSync(src, '# Epic source\n');

      const { run_id } = await handleRunCreate({ project_ref: 'ALPHA', source_file: src });

      await expect(
        handleRunTransition({ project_ref: 'ALPHA', run_id, action: 'start_phase', phase: 'split' }),
      ).rejects.toThrow();
    });

    it('validates saved manifest can be retrieved and validated', async () => {
      const src = join(tmpDir, 'source.md');
      writeFileSync(src, '# Epic source\n');

      const { run_id } = await handleRunCreate({ project_ref: 'ALPHA', source_file: src });

      const manifest = { ...goldenStories, run_id, project_ref: 'ALPHA' };
      await handleManifestSave({ project_ref: 'ALPHA', run_id, type: 'stories', manifest });

      const getResult = await handleManifestGet({ project_ref: 'ALPHA', run_id, type: 'stories' });
      expect(getResult.summary.total).toBe(3);

      const validateResult = await handleManifestValidate({ project_ref: 'ALPHA', run_id, type: 'stories' });
      expect(validateResult.valid).toBe(true);
      expect(validateResult.errors).toHaveLength(0);
    });
  });
});
