import type { RuleDocStatus } from '../../types/manifest.js';

/** Compact the shared target display data without assuming a host channel. */
export function ruleChannelLabel(statuses: RuleDocStatus[]): string {
  const targets = [
    ...new Set(statuses.map((status) => status.activeDisplayTarget)),
  ];
  if (targets.length === 1) return targets[0] ?? '';

  const first = targets[0] ?? '';
  const slash = Math.max(first.lastIndexOf('/'), first.lastIndexOf('\\'));
  const directory = first.slice(0, slash + 1);
  if (
    directory !== '' &&
    targets.every((target) => {
      const remainder = target.slice(directory.length);
      return (
        target.startsWith(directory) &&
        !remainder.includes('/') &&
        !remainder.includes('\\')
      );
    })
  )
    return directory;

  return targets.join(', ');
}
