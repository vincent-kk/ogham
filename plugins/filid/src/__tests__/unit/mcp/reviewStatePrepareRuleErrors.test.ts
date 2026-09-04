import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REVIEW_STATE_DIAGNOSTIC_CODES } from '../../../constants/reviewState.js';
import { toolError } from '../../../mcp/server/envelope/toolError.js';
import { loadPrepareReviewRules } from '../../../mcp/tools/reviewState/handlers/utils/loadPrepareReviewRules.js';

import { createReviewRulePluginRoot } from './reviewState/helpers/createReviewRulePluginRoot.js';

describe('prepare rule loading errors', () => {
  it('preserves the missing rule-map diagnostic through the MCP error envelope', () => {
    let thrown: unknown;
    try {
      loadPrepareReviewRules('/tmp/project', null);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      code: REVIEW_STATE_DIAGNOSTIC_CODES.RULE_MAP_MISSING,
    });
    const result = toolError(thrown);
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      diagnostics: [{ code: REVIEW_STATE_DIAGNOSTIC_CODES.RULE_MAP_MISSING }],
    });
  });

  it('preserves the escaping rule-path diagnostic through the MCP error envelope', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'filid-review-error-'));
    const pluginRoot = createReviewRulePluginRoot();
    try {
      mkdirSync(join(projectRoot, '.filid'));
      writeFileSync(
        join(projectRoot, '.filid', 'review-rules.json'),
        JSON.stringify({
          rules: [{ id: 'escape', always: true, file: '../outside-rule.md' }],
        }),
        'utf8',
      );

      let thrown: unknown;
      try {
        loadPrepareReviewRules(projectRoot, pluginRoot);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toMatchObject({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.RULE_PATH_ESCAPE,
      });
      const result = toolError(thrown);
      expect(JSON.parse(result.content[0].text)).toMatchObject({
        diagnostics: [{ code: REVIEW_STATE_DIAGNOSTIC_CODES.RULE_PATH_ESCAPE }],
      });
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
      rmSync(pluginRoot, { recursive: true, force: true });
    }
  });
});
