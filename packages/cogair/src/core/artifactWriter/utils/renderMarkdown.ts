import type { Provider } from '../../../types/index.js';

export interface RenderMarkdownArgs {
  sessionId: string;
  provider: Provider;
  model: string;
  turn: number;
  createdAt: string;
  elapsedMs: number;
  prompt: string;
  response: string;
}

export function renderMarkdown(args: RenderMarkdownArgs): string {
  const frontMatter = [
    '---',
    `session_id: ${JSON.stringify(args.sessionId)}`,
    `provider: ${args.provider}`,
    `model: ${JSON.stringify(args.model)}`,
    `turn: ${args.turn}`,
    `created_at: ${JSON.stringify(args.createdAt)}`,
    `elapsed_ms: ${args.elapsedMs}`,
    'status: success',
    '---',
    '',
  ].join('\n');
  return `${frontMatter}\n## Prompt\n\n${args.prompt}\n\n## Response\n\n${args.response}\n`;
}
