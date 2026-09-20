import { McpToolName } from '../../../../constants/mcpToolNames.js';
import type { connectTestClient } from '../../helpers/connectTestClient.js';

/** One tool envelope as the transport delivers it. */
export interface FactsEnvelope {
  status: string;
  summary: Record<string, unknown>;
  data: Record<string, unknown>;
  diagnostics: { code: string; nextAction: string }[];
}

/**
 * Call the facts tool the way a model does, through the advertised schema.
 *
 * The SDK parses arguments with the advertised object before the handler sees
 * them, so an argument only the internal union accepts is stripped here and
 * nowhere else. These scenarios are about what an agent can actually reach.
 *
 * @param connection Connected test client wrapping one server.
 * @param args Arguments exactly as a model would send them.
 * @returns The parsed envelope.
 * @throws When the transport returns something other than one text block.
 */
export async function callFactsThroughTransport(
  connection: Awaited<ReturnType<typeof connectTestClient>>,
  args: Record<string, unknown>,
): Promise<FactsEnvelope> {
  const result = await connection.client.callTool({
    name: McpToolName.FACTS,
    arguments: args,
  });
  const content: unknown = Array.isArray(result.content)
    ? result.content[0]
    : null;
  if (
    !content ||
    typeof content !== 'object' ||
    !('text' in content) ||
    typeof content.text !== 'string'
  )
    throw new Error('expected a text envelope');
  return JSON.parse(content.text) as FactsEnvelope;
}
