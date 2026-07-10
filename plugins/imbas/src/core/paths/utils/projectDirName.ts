/**
 * @file projectDirName.ts
 * @description Map a project_ref to its .imbas/ directory segment.
 *   GitHub "owner/repo" refs map to "owner--repo" (slash → double dash,
 *   per SPEC-provider §6). Rejects refs that cannot form a single safe
 *   path segment.
 */
export function projectDirName(projectRef: string): string {
  const mapped = projectRef.trim().replaceAll('/', '--');

  if (
    mapped.length === 0 ||
    mapped === '.' ||
    mapped === '..' ||
    mapped.includes('\\') ||
    mapped.includes('\0')
  )
    throw new Error(`Invalid project_ref: "${projectRef}"`);

  return mapped;
}
