export function extractImportPaths(content: string): string[] {
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  const paths: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}
