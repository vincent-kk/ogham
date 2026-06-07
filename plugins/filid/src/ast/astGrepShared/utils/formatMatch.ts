export function formatMatch(
  filePath: string,
  _matchText: string,
  startLine: number,
  endLine: number,
  context: number,
  fileContent: string,
): string {
  const lines = fileContent.split('\n');
  const contextStart = Math.max(0, startLine - context - 1);
  const contextEnd = Math.min(lines.length, endLine + context);

  const contextLines = lines.slice(contextStart, contextEnd);
  const numberedLines = contextLines.map((line, i) => {
    const lineNum = contextStart + i + 1;
    const isMatch = lineNum >= startLine && lineNum <= endLine;
    const prefix = isMatch ? '>' : ' ';
    return `${prefix} ${lineNum.toString().padStart(4)}: ${line}`;
  });

  return `${filePath}:${startLine}\n${numberedLines.join('\n')}`;
}
