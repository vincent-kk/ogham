import type { GeminiFlags } from '../../../types/index.js';

export interface BuildPromptArgsInput {
  model: string | null;
  prompt: string;
  flags: GeminiFlags;
  resumeIndex?: number;
}

export function buildPromptArgs(input: BuildPromptArgsInput): string[] {
  const argv: string[] = [];
  if (input.resumeIndex !== undefined) {
    argv.push('--resume', String(input.resumeIndex));
  }
  if (input.flags.yolo) argv.push('--yolo');
  if (input.flags.sandbox) argv.push('--sandbox');
  if (input.model) argv.push('-m', input.model);
  argv.push('-p', input.prompt);
  return argv;
}
