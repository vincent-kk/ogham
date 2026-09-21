import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS } from '../../constants/reviewState.js';
import { createServer } from '../../mcp/server/lifecycle/createServer.js';
import type { ReviewStateRecord } from '../../mcp/tools/reviewState/state/reviewStateTypes.js';
import { buildReviewOpinion } from '../unit/mcp/reviewState/helpers/buildReviewOpinion.js';
import { configureReviewGroups } from '../unit/mcp/reviewState/helpers/configureReviewGroups.js';
import { createReviewStateSealFixture } from '../unit/mcp/reviewState/helpers/createReviewStateSealFixture.js';
import { runReviewStateFixtureGit } from '../unit/mcp/reviewState/helpers/runReviewStateFixtureGit.js';
import { writeReviewStateFixtureFile } from '../unit/mcp/reviewState/helpers/writeReviewStateFixtureFile.js';

import { connectTestClient } from './helpers/connectTestClient.js';
import { seedFacts } from './helpers/seedFacts.js';

/** One tool response, as the transport hands it back. */
interface Envelope {
  status: string;
  summary: Record<string, unknown>;
  data?: Record<string, unknown>;
  diagnostics?: { code: string; nextAction: string }[];
  artifact?: { path: string };
}

/**
 * Read a tool result's envelope, following the artifact a large one writes.
 * @param result What `callTool` returned.
 * @returns The envelope, with `data` filled from the artifact when needed.
 */
function envelopeOf(result: unknown): Envelope {
  const text = (result as { content: { text: string }[] }).content[0].text;
  const envelope = JSON.parse(text) as Envelope;
  if (envelope.data !== undefined || envelope.artifact === undefined)
    return envelope;
  return {
    ...envelope,
    data: (
      JSON.parse(readFileSync(envelope.artifact.path, 'utf8')) as {
        data: Record<string, unknown>;
      }
    ).data,
  };
}

describe('seal answers a facts discrepancy through the real MCP server', () => {
  it('names the unsettled item, then the edge the freeze lost', async () => {
    const fixture = await createReviewStateSealFixture();
    await configureReviewGroups(fixture.projectRoot, 1);
    writeReviewStateFixtureFile(
      fixture.projectRoot,
      'src/helper.ts',
      'export const helper = 1;\n',
    );
    writeReviewStateFixtureFile(
      fixture.projectRoot,
      'src/value.ts',
      "import { helper } from './helper.js';\n\nexport const value = helper;\n",
    );
    runReviewStateFixtureGit(fixture.projectRoot, ['add', '--all']);
    runReviewStateFixtureGit(fixture.projectRoot, ['commit', '-m', 'import']);
    // The skill bootstraps the facts of what it committed before preparing;
    // the gate refuses a review scope whose facts are not settled.
    await seedFacts(fixture.projectRoot);
    const connection = await connectTestClient(createServer());
    const call = async (
      name: string,
      args: Record<string, unknown>,
    ): Promise<Envelope> =>
      envelopeOf(await connection.client.callTool({ name, arguments: args }));
    try {
      const prepared = await call('review_state', {
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
        baseRef: 'main',
        effort: 'low',
      });
      const data = prepared.data as {
        statePath: string;
        next: { group: string; outputPath: string }[];
      };
      const state: ReviewStateRecord = JSON.parse(
        readFileSync(data.statePath, 'utf8'),
      ) as ReviewStateRecord;
      const handoff = data.next[0];
      writeFileSync(
        handoff.outputPath,
        JSON.stringify(buildReviewOpinion(state, state.groups[0])),
      );
      await call('review_state', {
        action: 'validate',
        projectRoot: fixture.projectRoot,
        group: handoff.group,
        kind: 'review',
        round: 1,
      });

      // The store walks the reviewed file's one edge back after the freeze.
      const status = await call('facts', {
        action: 'status',
        path: fixture.projectRoot,
      });
      const bytes = readFileSync(join(fixture.projectRoot, 'src/value.ts'));
      const submission = join(fixture.pluginRoot, 'walked-back.json');
      writeFileSync(
        submission,
        JSON.stringify([
          {
            schemaVersion: 1,
            path: 'src/value.ts',
            contentHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
            references: [],
            provenance: {
              tool: 'other-tool',
              version: '1.0.0',
              command: 'test',
              tier: 'tool',
              resolutionInputs: [],
            },
          },
        ]),
      );
      await call('facts', {
        action: 'submit',
        path: fixture.projectRoot,
        file: submission,
        resolutionEpoch: status.summary.resolutionEpoch,
      });

      const unsettled = await call('review_state', {
        action: 'seal',
        projectRoot: fixture.projectRoot,
      });

      expect(unsettled.status).toBe('indeterminate');
      expect(unsettled.diagnostics?.[0]?.nextAction).toBe(
        REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.FACTS_DISCREPANCY_UNSETTLED,
      );

      // Two actors settle it the way the store now reads the file: the edge is
      // gone, which is exactly what the freeze was judged on.
      const open = await call('facts', {
        action: 'status',
        path: fixture.projectRoot,
      });
      const item = (
        open.data as {
          unadjudicated: {
            items: {
              path: string;
              kind: string;
              reference: string;
              resolvedPath: string;
              contentHash: string;
            }[];
          };
        }
      ).unadjudicated.items[0];
      for (const actor of ['alpha', 'beta'])
        await call('facts', {
          action: 'adjudicate',
          path: fixture.projectRoot,
          sourcePath: item.path,
          contentHash: item.contentHash,
          actor,
          items: [
            {
              kind: item.kind,
              reference: item.reference,
              resolvedPath: item.resolvedPath,
              decision: 'dismiss',
              reason: 'the import is gone from the file',
            },
          ],
        });

      const moved = await call('review_state', {
        action: 'seal',
        projectRoot: fixture.projectRoot,
      });

      expect(moved.status).toBe('indeterminate');
      expect(moved.diagnostics?.[0]?.nextAction).toBe(
        REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.FACTS_DISCREPANCY_FROZEN_EDGES_CHANGED,
      );
    } finally {
      await connection.close();
      rmSync(fixture.projectRoot, { recursive: true, force: true });
      rmSync(fixture.pluginRoot, { recursive: true, force: true });
      if (fixture.originalPluginRoot === undefined)
        delete process.env.CLAUDE_PLUGIN_ROOT;
      else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
    }
  }, 300_000);
});
