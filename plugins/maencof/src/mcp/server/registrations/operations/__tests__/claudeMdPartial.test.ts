/** Regression through registered MCP tools: partial writes must reach toolError. */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  ArtifactPartialFailure,
  InstructionSectionApplyResult,
} from '@ogham/agent-artifacts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerClaudeMdTools } from '../claudeMd.js';

/** Only the instruction manager is replaced; tool registration and error handling are real. */
const manager = vi.hoisted(() => ({
  inspect: vi.fn(() => ({
    status: 'present',
    target: '/vault/AGENTS.override.md',
  })),
  plan: vi.fn(() => ({ outcomes: [{ action: 'update' }] })),
  apply: vi.fn<() => InstructionSectionApplyResult>(),
}));
/** Successful mutation bookkeeping must not run for a partial result. */
const sideEffects = vi.hoisted(() => ({
  invalidate: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock(
  '../../../../../core/claudeMdMerger/index.js',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('../../../../../core/claudeMdMerger/index.js')
    >()),
    createProjectInstructionManager: () => manager,
  }),
);
vi.mock('../../../graphCache/index.js', () => ({
  getVaultPath: () => '/vault',
  invalidateCache: sideEffects.invalidate,
}));
vi.mock('../../../middlewares/mutateSideEffects.js', () => ({
  runMutateSideEffects: sideEffects.mutate,
}));
vi.mock('../../../middlewares/usageStats.js', () => ({
  incrementUsageStat: vi.fn(),
}));
vi.mock('../../../middlewares/freshnessGuard.js', () => ({
  ensureFreshGraphNonBlocking: vi.fn(),
}));

/** Connected SDK peers exercise the public MCP envelope, including isError. */
let server: McpServer;
/** Client sends ordinary calls through the registered schema and middleware. */
let client: Client;

beforeEach(async () => {
  vi.clearAllMocks();
  server = new McpServer({ name: 'instruction-test', version: '1.0.0' });
  client = new Client({ name: 'instruction-test-client', version: '1.0.0' });
  registerClaudeMdTools(server);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
});

afterEach(async () => {
  await client.close();
  await server.close();
});

/** Realistic manager results at each failure boundary, including unfinished cleanup. */
const failures: { name: string; failure: ArtifactPartialFailure }[] = [
  {
    name: 'first-file failure',
    failure: {
      applied: [],
      failed: {
        target: '/vault/AGENTS.override.md',
        error: 'permission denied',
      },
      notAttempted: ['/vault/AGENTS.md'],
      backupPaths: [],
    },
  },
  {
    name: 'write failure after its backup',
    failure: {
      applied: [],
      failed: { target: '/vault/AGENTS.override.md', error: 'disk full' },
      notAttempted: ['/vault/AGENTS.md'],
      backupPaths: ['/vault/AGENTS.override.md.bak'],
    },
  },
  {
    name: 'relocation destination written but source cleanup failed',
    failure: {
      applied: ['/vault/AGENTS.override.md'],
      failed: { target: '/vault/AGENTS.md', error: 'source is read-only' },
      notAttempted: ['/vault/.agents/AGENTS.md'],
      backupPaths: ['/vault/AGENTS.override.md.bak', '/vault/AGENTS.md.bak'],
    },
  },
];

describe.each(['claudemd_merge', 'claudemd_remove'])(
  '%s partial application',
  (name) => {
    it.each(failures)(
      '$name returns an MCP error preserving all recovery details',
      async ({ failure }) => {
        const partialFailures = [failure];
        manager.apply.mockReturnValue({
          outcomes: [
            {
              id: 'maencof',
              target: '/vault/AGENTS.override.md',
              action: 'partial',
            },
          ],
          revisions: [],
          partialFailures,
          backupPaths: failure.backupPaths,
        });

        const response = await client.callTool({
          name,
          arguments:
            name === 'claudemd_merge'
              ? { content: 'private instructions' }
              : {},
        });

        expect(response).toEqual({
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error: ${JSON.stringify({ status: 'partial', partialFailures })}`,
            },
          ],
        });
        expect(manager.apply).toHaveBeenCalledOnce();
        expect(sideEffects.invalidate).not.toHaveBeenCalled();
        expect(sideEffects.mutate).not.toHaveBeenCalled();
      },
    );
  },
);
