/**
 * @file report-renderer.ts
 * @description Render ImplementPlanManifest as human-readable markdown
 */

import type { ImplementPlanManifest } from '../../types/manifest.js';

export function renderImplementPlanReport(
  manifest: ImplementPlanManifest,
): string {
  const lines: string[] = [];
  lines.push(`# Implement Plan — ${manifest.project_ref} / ${manifest.run_id}`);
  lines.push('');
  lines.push(`- Source: ${manifest.source_manifest}`);
  lines.push(`- Created: ${manifest.created_at}`);
  if (manifest.degraded) {
    lines.push(`- **Degraded mode** — precision limited (stories-only)`);
  }
  lines.push('');

  if (manifest.groups.length === 0) {
    lines.push('> No groups generated.');
  } else {
    lines.push('## Execution Order');
    lines.push('');
    const byLevel = new Map<number, typeof manifest.groups>();
    for (const g of manifest.groups) {
      const arr = byLevel.get(g.level) ?? [];
      arr.push(g);
      byLevel.set(g.level, arr);
    }
    const levels = [...byLevel.keys()].sort((a, b) => a - b);
    for (const level of levels) {
      lines.push(`### Level ${level}`);
      lines.push('');
      for (const g of byLevel.get(level)!) {
        const itemList = g.items
          .map((i) => `${i.id}${i.issue_ref ? ` (${i.issue_ref})` : ''}`)
          .join(', ');
        const parallel = g.can_parallel ? 'parallel' : 'single';
        lines.push(`- **${g.group_id}** [${parallel}]: ${itemList}`);
      }
      lines.push('');
    }
  }

  if (manifest.cycles_broken.length > 0) {
    lines.push('## Cycles Broken');
    lines.push('');
    for (const c of manifest.cycles_broken) {
      lines.push(`- nodes: ${c.nodes.join(' -> ')} — ${c.resolution}`);
    }
    lines.push('');
  }

  if (manifest.unresolved.length > 0) {
    lines.push('## Unresolved');
    lines.push('');
    lines.push(`- ${manifest.unresolved.join(', ')}`);
    lines.push('');
  }

  return lines.join('\n');
}
