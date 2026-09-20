import { rmSync, writeFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { McpToolName } from '../../constants/mcpToolNames.js';
import {
  MCP_TOOL_INPUT_SCHEMAS,
  createServer,
} from '../../mcp/server/lifecycle/createServer.js';
import { handleReviewState } from '../../mcp/tools/reviewState/index.js';
import { buildReviewOpinion } from '../unit/mcp/reviewState/helpers/buildReviewOpinion.js';
import { configureReviewGroups } from '../unit/mcp/reviewState/helpers/configureReviewGroups.js';
import { createReviewStateSealFixture } from '../unit/mcp/reviewState/helpers/createReviewStateSealFixture.js';

import { connectTestClient } from './helpers/connectTestClient.js';

/** Review fixture used by the transport case. */
let fixture: ReturnType<typeof createReviewStateSealFixture> | undefined;

afterEach(() => {
  if (!fixture) return;
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
  fixture = undefined;
});

/** Every key the object shapes of one schema accept, unions included. */
function acceptedKeys(schema: z.ZodTypeAny): Set<string> {
  const keys = new Set<string>();
  const visit = (node: z.ZodTypeAny): void => {
    if (node instanceof z.ZodObject) {
      for (const key of Object.keys(node.shape as Record<string, unknown>))
        keys.add(key);
      return;
    }
    if (node instanceof z.ZodUnion || node instanceof z.ZodDiscriminatedUnion)
      for (const option of node.options as z.ZodTypeAny[]) visit(option);
    else if (node instanceof z.ZodEffects) visit(node.innerType());
    else if (node instanceof z.ZodOptional || node instanceof z.ZodNullable)
      visit(node.unwrap() as z.ZodTypeAny);
  };
  visit(schema);
  return keys;
}

describe('every argument an action accepts survives the advertised tool schema', () => {
  it.each(
    MCP_TOOL_INPUT_SCHEMAS.map(({ tool, advertised, internal }) => [
      tool,
      advertised,
      internal,
    ]),
  )(
    '%s advertises every key its actions read',
    (_tool, advertised, internal) => {
      const advertisedKeys = acceptedKeys(advertised as z.ZodTypeAny);
      expect(
        [...acceptedKeys(internal as z.ZodTypeAny)].filter(
          (key) => !advertisedKeys.has(key),
        ),
      ).toEqual([]);
    },
  );

  it('refuses an opinion from a superseded generation through the MCP transport', async () => {
    fixture = createReviewStateSealFixture();
    configureReviewGroups(fixture.projectRoot, 1);
    const first = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    const dispatched = first.data.next[0]!;
    const checkpoint = await handleReviewState({
      action: 'checkpoint',
      projectRoot: fixture.projectRoot,
    });
    const state = checkpoint.data.state!;
    writeFileSync(
      dispatched.outputPath,
      JSON.stringify(
        buildReviewOpinion(
          state,
          state.groups.find((group) => group.id === dispatched.group)!,
          dispatched.round,
        ),
      ),
    );
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
      userInstructions: 'second',
    });
    const connection = await connectTestClient(createServer());
    try {
      const result = await connection.client.callTool({
        name: McpToolName.REVIEW_STATE,
        arguments: {
          action: 'validate',
          projectRoot: fixture.projectRoot,
          kind: dispatched.kind,
          group: dispatched.group,
          ...(dispatched.round === undefined
            ? {}
            : { round: dispatched.round }),
          generationId: dispatched.generationId,
        },
      });
      const content = Array.isArray(result.content) ? result.content[0] : null;
      const envelope = JSON.parse((content as { text: string }).text);
      expect(
        envelope.diagnostics.map(({ code }: { code: string }) => code),
      ).toContain('review-generation-superseded');
    } finally {
      await connection.close();
    }
  });
});
