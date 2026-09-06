import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { createServer } from '../../mcp/server/lifecycle/createServer.js';
import { createReviewStateSealFixture } from '../unit/mcp/reviewState/helpers/createReviewStateSealFixture.js';

import { connectTestClient } from './helpers/connectTestClient.js';

/** Canonical package surface, independent of installed plugin copies. */
const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('incremental runtime wiring', () => {
  it('keeps the Claude agent native and compiles a Codex persona fallback', () => {
    const actor = readFileSync(join(root, 'agents/review-actor.md'), 'utf8');
    const codexActor = readFileSync(
      join(root, '.codex-plugin/skills/.shared/personas/review-actor.md'),
      'utf8',
    );
    const codexSkill = readFileSync(
      join(root, '.codex-plugin/skills/cross-review/SKILL.md'),
      'utf8',
    );

    expect(codexActor).toBe(actor);
    expect(codexSkill).toContain('<!-- codex-persona-spawn');
    expect(codexSkill).toContain('Codex has no `subagent_type` persona');
    expect(codexSkill).toContain('`../.shared/personas/<id>.md`');
    expect(codexSkill).toContain('repository fallback chosen in Step 2');
  });

  it('advertises and accepts context through the real MCP validation boundary', async () => {
    const fixture = createReviewStateSealFixture();
    const connection = await connectTestClient(createServer());
    try {
      const listed = await connection.client.listTools();
      const schema = listed.tools.find(
        (tool) => tool.name === 'review_state',
      )!.inputSchema;
      expect(schema.properties).toHaveProperty('actorContext');
      expect(schema.properties).toHaveProperty('operation');
      const prepared = await connection.client.callTool({
        name: 'review_state',
        arguments: {
          action: 'prepare',
          projectRoot: fixture.projectRoot,
          effort: 'low',
          actorContext: {
            mode: 'isolated',
            userInstructions: 'USR-001: Verify public behavior.',
          },
        },
      });
      const result = JSON.parse(
        (prepared.content as { text: string }[])[0].text,
      );
      expect(prepared.isError).not.toBe(true);
      const data =
        result.data ??
        JSON.parse(readFileSync(result.artifact.path, 'utf8')).data;
      const next = data.next[0];
      const request = {
        action: 'context',
        projectRoot: fixture.projectRoot,
        group: next.group,
        kind: next.kind,
        round: next.round,
        generationId: next.context.generationId,
        token: next.context.token,
        operation: 'brief',
      };
      const brief = await connection.client.callTool({
        name: 'review_state',
        arguments: request,
      });
      expect(brief.isError).not.toBe(true);
      const page = JSON.parse((brief.content as { text: string }[])[0].text);
      expect(page.data.context.text).toContain(
        'USR-001: Verify public behavior.',
      );
      expect(page.artifact).toBeUndefined();
      expect(page.data.state).toBeUndefined();
      const denied = await connection.client.callTool({
        name: 'review_state',
        arguments: { ...request, token: 'wrong' },
      });
      expect(denied.isError).toBe(true);
    } finally {
      await connection.close();
      rmSync(fixture.projectRoot, { recursive: true, force: true });
      rmSync(fixture.pluginRoot, { recursive: true, force: true });
      if (fixture.originalPluginRoot === undefined)
        delete process.env.CLAUDE_PLUGIN_ROOT;
      else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
    }
  });

  it('ships a native allowlist and executes the built deny guard against every escape surface', () => {
    const agent = readFileSync(join(root, 'agents/review-actor.md'), 'utf8');
    const hookManifest = readFileSync(join(root, 'hooks/hooks.json'), 'utf8');
    const hookRunner = join(root, 'libs/run.cjs');
    const guardBundle = join(root, 'bridge/guard-review-actor.mjs');
    expect(agent).toContain('  - mcp__plugin_filid_tools__review_state');
    expect(agent).not.toContain('\nhooks:');
    expect(hookManifest).toContain('bridge/guard-review-actor.mjs');
    for (const tool of [
      'Read',
      'Bash',
      'Glob',
      'Grep',
      'Agent',
      'Task',
      'mcp__other__read',
      'mcp__plugin_filid_tools__review_state',
    ]) {
      const denied = spawnSync(process.execPath, [hookRunner, guardBundle], {
        input: JSON.stringify({
          agent_type: 'review-actor',
          hook_event_name: 'PreToolUse',
          tool_name: tool,
          tool_input: { action: 'prepare' },
        }),
        encoding: 'utf8',
      });
      expect(denied.status).toBe(0);
      expect(
        JSON.parse(denied.stdout).hookSpecificOutput.permissionDecision,
      ).toBe('deny');
    }
    const accepted = spawnSync(process.execPath, [hookRunner, guardBundle], {
      input: JSON.stringify({
        agent_type: 'filid:review-actor',
        hook_event_name: 'PreToolUse',
        tool_name: 'mcp__plugin_filid_tools__review_state',
        tool_input: { action: 'context' },
      }),
      encoding: 'utf8',
    });
    expect(accepted.status).toBe(0);
    expect(JSON.parse(accepted.stdout)).toEqual({ continue: true });

    const unrelated = spawnSync(process.execPath, [hookRunner, guardBundle], {
      input: JSON.stringify({
        agent_type: 'general-purpose',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command: 'git status --short' },
      }),
      encoding: 'utf8',
    });
    expect(unrelated.status).toBe(0);
    expect(JSON.parse(unrelated.stdout)).toEqual({ continue: true });
  });
});
