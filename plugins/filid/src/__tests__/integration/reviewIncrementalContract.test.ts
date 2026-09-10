import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { createServer } from '../../mcp/server/lifecycle/createServer.js';
import type { ReviewStateRecord } from '../../mcp/tools/reviewState/state/reviewStateTypes.js';
import { buildReviewOpinion } from '../unit/mcp/reviewState/helpers/buildReviewOpinion.js';
import { createReviewStateSealFixture } from '../unit/mcp/reviewState/helpers/createReviewStateSealFixture.js';

import { connectTestClient } from './helpers/connectTestClient.js';

/** Canonical package and generated host adapters are tested together after build. */
const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('ordinary incremental review wiring', () => {
  it('uses the same ordinary handoff contract for Claude and Codex', () => {
    const manifest = JSON.parse(
      readFileSync(join(root, '.codex-plugin/plugin.json'), 'utf8'),
    );
    expect(manifest.skills).toBe('./.codex-plugin/skills/');
    for (const relative of [
      'skills/cross-review/SKILL.md',
      join(manifest.skills, 'cross-review/SKILL.md'),
    ]) {
      const skill = readFileSync(join(root, relative), 'utf8');
      expect(skill).toContain('userInstructions:');
      expect(skill).toContain('action: "validate"');
      expect(skill).not.toContain('subagent_type: "filid:review-actor"');
      expect(skill).not.toContain('action=context');
      expect(skill).not.toContain('actorContext:');
    }
    expect(existsSync(join(root, 'agents/review-actor.md'))).toBe(false);
    expect(
      existsSync(
        join(root, '.codex-plugin/skills/.shared/personas/review-actor.md'),
      ),
    ).toBe(false);
  });

  it('prepares, accepts an ordinary opinion file and seals through the real MCP server', async () => {
    const fixture = createReviewStateSealFixture();
    const connection = await connectTestClient(createServer());
    try {
      const listed = await connection.client.listTools();
      const schema = listed.tools.find(
        (tool) => tool.name === 'review_state',
      )!.inputSchema;
      expect(schema.properties).toHaveProperty('userInstructions');
      expect(schema.properties).not.toHaveProperty('actorContext');
      expect(schema.properties).not.toHaveProperty('operation');
      const prepared = await connection.client.callTool({
        name: 'review_state',
        arguments: {
          action: 'prepare',
          projectRoot: fixture.projectRoot,
          effort: 'low',
          userInstructions: 'USR-001: Verify public behavior.',
        },
      });
      expect(prepared.isError).not.toBe(true);
      const envelope = JSON.parse(
        (prepared.content as { text: string }[])[0].text,
      );
      const data =
        envelope.data ??
        JSON.parse(readFileSync(envelope.artifact.path, 'utf8')).data;
      const state: ReviewStateRecord = JSON.parse(
        readFileSync(data.statePath, 'utf8'),
      );
      const handoff = data.next[0];
      expect(readFileSync(handoff.briefPath, 'utf8')).toContain(
        'USR-001: Verify public behavior.',
      );
      writeFileSync(
        handoff.outputPath,
        JSON.stringify(buildReviewOpinion(state, state.groups[0])),
      );
      const validated = await connection.client.callTool({
        name: 'review_state',
        arguments: {
          action: 'validate',
          projectRoot: fixture.projectRoot,
          group: handoff.group,
          kind: 'review',
          round: 1,
        },
      });
      expect(validated.isError).not.toBe(true);
      expect(
        JSON.parse((validated.content as { text: string }[])[0].text).summary
          .ok,
      ).toBe(true);
      const sealed = await connection.client.callTool({
        name: 'review_state',
        arguments: { action: 'seal', projectRoot: fixture.projectRoot },
      });
      expect(sealed.isError).not.toBe(true);
      expect(
        JSON.parse((sealed.content as { text: string }[])[0].text).summary
          .verdict,
      ).toBe('APPROVED');
      const removed = await connection.client.callTool({
        name: 'review_state',
        arguments: { action: 'context', projectRoot: fixture.projectRoot },
      });
      expect(removed.isError).toBe(true);
    } finally {
      await connection.close();
      rmSync(fixture.projectRoot, { recursive: true, force: true });
      rmSync(fixture.pluginRoot, { recursive: true, force: true });
      if (fixture.originalPluginRoot === undefined)
        delete process.env.CLAUDE_PLUGIN_ROOT;
      else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
    }
  });

  it('omits the review guard from canonical, generated and delivered hook surfaces', () => {
    for (const relative of [
      'hooks/hooks.json',
      'hooks.json',
      '.codex-plugin/hooks.json',
      'scripts/buildHooks.mjs',
    ])
      expect(readFileSync(join(root, relative), 'utf8')).not.toContain(
        'guard-review-actor',
      );
    expect(existsSync(join(root, 'bridge/guard-review-actor.mjs'))).toBe(false);
  });
});
