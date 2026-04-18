import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  KNOWN_ORGAN_DIR_NAMES,
  classifyNode,
} from '../../../core/tree/organ-classifier/organ-classifier.js';

export function classifyPathCategory(filePath: string, cwd: string): string {
  const segments = filePath
    .replace(/\\/g, '/')
    .split('/')
    .filter((p) => p.length > 0);

  // INTENT.md, DETAIL.md를 포함하면 fractal
  const fileName = segments[segments.length - 1] ?? '';
  if (fileName === 'INTENT.md' || fileName === 'DETAIL.md') return 'fractal';

  // 구조 기반 organ 분류
  let dirSoFar = cwd;
  for (const segment of segments.slice(0, -1)) {
    dirSoFar = path.join(dirSoFar, segment);
    try {
      if (!fs.existsSync(dirSoFar)) {
        // 파일시스템에 없으면 레거시 이름 기반 폴백
        if (KNOWN_ORGAN_DIR_NAMES.includes(segment)) return 'organ';
        continue;
      }
      const entries = fs.readdirSync(dirSoFar, { withFileTypes: true });
      const hasIntentMd = entries.some(
        (e) => e.isFile() && e.name === 'INTENT.md',
      );
      const hasDetailMd = entries.some(
        (e) => e.isFile() && e.name === 'DETAIL.md',
      );
      const subdirs = entries.filter((e) => e.isDirectory());
      const isLeafDirectory = subdirs.length === 0;
      const hasFractalChildren = subdirs.some((d) => {
        try {
          const childPath = path.join(dirSoFar, d.name);
          const childEntries = fs.readdirSync(childPath, {
            withFileTypes: true,
          });
          return childEntries.some(
            (ce) =>
              ce.isFile() &&
              (ce.name === 'INTENT.md' || ce.name === 'DETAIL.md'),
          );
        } catch {
          return false;
        }
      });
      const category = classifyNode({
        dirName: segment,
        hasIntentMd,
        hasDetailMd,
        hasFractalChildren,
        isLeafDirectory,
      });
      if (category === 'organ') return 'organ';
    } catch {
      continue;
    }
  }

  return 'unknown';
}
