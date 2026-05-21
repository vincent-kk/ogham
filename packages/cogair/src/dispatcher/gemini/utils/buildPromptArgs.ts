export function buildPromptArgs(
  model: string | null,
  prompt: string,
  resumeIndex?: number,
): string[] {
  const argv: string[] = [];
  if (resumeIndex !== undefined) argv.push('--resume', String(resumeIndex));
  if (model) argv.push('-m', model);
  argv.push('-p', prompt);
  return argv;
}
