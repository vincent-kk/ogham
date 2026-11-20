import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EMPTY_RESULT } from '../../../constants/plugin.js';
import { readDirectiveBindings } from '../../../core/directives/utils/readDirectiveBindings.js';
import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import type { PostToolUseInput } from '../../../types/hooks.js';
import { CLAUDE_WORKFLOW_ADAPTER } from '../../shared/workflowAdapters/claude.js';
import { CODEX_WORKFLOW_ADAPTER } from '../../shared/workflowAdapters/codex.js';
import { workflowIdentity } from '../../shared/workflowHost/workflowIdentity.js';
import { processToolOutcome } from '../postToolUse.js';

const now = Date.UTC(2026, 0, 30);

describe.each([CLAUDE_WORKFLOW_ADAPTER, CODEX_WORKFLOW_ADAPTER])(
  '$name directive bind',
  (adapter) => {
    let root: string;
    let input: PostToolUseInput;

    /** Wrap an MCP text result in this host's native response shape. */
    function response(
      status: string,
      scope = 'session',
      isError = false,
      op = 'bind',
      set = 'focus',
    ) {
      const content = [
        {
          type: 'text',
          text: JSON.stringify({ status, op, set, scope, files: ['focus.md'] }),
        },
      ];
      return adapter.name === 'claude'
        ? Object.assign(content, { isError })
        : { content, isError };
    }

    beforeEach(() => {
      root = realpathSync(
        mkdtempSync(join(tmpdir(), 'seiri-hook-directive-bind-')),
      );
      mkdirSync(join(root, '.git'));
      writeConfig(root, 'project', { intervention: 'standard' });
      const directory = join(root, '.seiri', 'directives', 'focus');
      mkdirSync(directory, { recursive: true });
      writeFileSync(join(directory, 'focus.md'), 'focus');
      input = {
        hook_event_name: 'PostToolUse',
        tool_name: adapter.runtimeTool,
        tool_input: {
          action: 'directives',
          directives_op: 'bind',
          project_root: root,
          set: 'focus',
        },
        tool_response: response('accepted'),
        cwd: root,
        session_id: 'fresh-session',
      };
    });
    afterEach(() => rmSync(root, { recursive: true, force: true }));

    it('commits and acknowledges without any workflow turn anchor', () => {
      const result = processToolOutcome(input, adapter, now);
      expect(result.hookSpecificOutput?.additionalContext).toBe(
        '[seiri] Directives focus bound (scope session, 1 files)',
      );
      expect(readDirectiveBindings(root)).toEqual({
        focus: {
          enabled: true,
          root,
          scope: 'session',
          actor: workflowIdentity(input, adapter)?.actor,
          boundAt: now,
        },
      });
    });

    it('binds all main sessions without persisting an actor', () => {
      input.tool_input = { ...input.tool_input, scope: 'all' };
      input.tool_response = response('accepted', 'all');
      expect(
        processToolOutcome(input, adapter, now).hookSpecificOutput
          ?.additionalContext,
      ).toContain('scope all');
      expect(readDirectiveBindings(root)).toEqual({
        focus: { enabled: true, root, scope: 'all', boundAt: now },
      });
    });

    it('leaves no record or acknowledgment at dial off', () => {
      writeConfig(root, 'project', { intervention: 'off' });
      expect(processToolOutcome(input, adapter, now)).toEqual(EMPTY_RESULT);
      expect(readDirectiveBindings(root)).toEqual({});
    });

    it('leaves no record for a child actor', () => {
      expect(
        processToolOutcome({ ...input, agent_id: 'child' }, adapter, now),
      ).toEqual(EMPTY_RESULT);
      expect(readDirectiveBindings(root)).toEqual({});
    });

    it('rejects unsuccessful and mismatched responses', () => {
      for (const tool_response of [
        response('rejected'),
        response('accepted', 'all'),
        response('accepted', 'session', true),
        response('accepted', 'session', false, 'off'),
        response('accepted', 'session', false, 'bind', 'other'),
      ])
        expect(
          processToolOutcome({ ...input, tool_response }, adapter, now),
        ).toEqual(EMPTY_RESULT);
      expect(readDirectiveBindings(root)).toEqual({});
    });

    it('requires the native success event, runtime tool name, action and bind operation', () => {
      expect(
        processToolOutcome(
          { ...input, hook_event_name: 'PostToolUseFailure' },
          adapter,
          now,
        ),
      ).toEqual(EMPTY_RESULT);
      expect(
        processToolOutcome(
          { ...input, tool_name: 'another-runtime' },
          adapter,
          now,
        ),
      ).toEqual(EMPTY_RESULT);
      for (const overrides of [{ action: 'dial' }, { directives_op: 'status' }])
        expect(
          processToolOutcome(
            { ...input, tool_input: { ...input.tool_input, ...overrides } },
            adapter,
            now,
          ),
        ).toEqual(EMPTY_RESULT);
      expect(readDirectiveBindings(root)).toEqual({});
    });

    it('rejects a project_root in another repository', () => {
      const elsewhere = join(root, 'other');
      mkdirSync(join(elsewhere, '.git'), { recursive: true });
      input.tool_input = { ...input.tool_input, project_root: elsewhere };
      expect(processToolOutcome(input, adapter, now)).toEqual(EMPTY_RESULT);
      expect(readDirectiveBindings(root)).toEqual({});
    });
  },
);
