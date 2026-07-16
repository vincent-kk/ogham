import * as fs from 'node:fs';
import * as path from 'node:path';

import { DETAIL_MD, INTENT_MD } from '../../../constants/documentFiles.js';
import {
  KNOWN_ORGAN_DIR_NAMES,
  classifyNode,
} from '../../../core/tree/organClassifier/organClassifier.js';

export function classifyPathCategory(filePath: string, cwd: string): string {
  const segments = filePath
    .replace(/\\/g, '/')
    .split('/')
    .filter((p) => p.length > 0);

  // INTENT.md, DETAIL.md를 포함하면 fractal
  const fileName = segments[segments.length - 1] ?? '';
  if (fileName === INTENT_MD || fileName === DETAIL_MD) return 'fractal';

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
        (e) => e.isFile() && e.name === INTENT_MD,
      );
      const hasDetailMd = entries.some(
        (e) => e.isFile() && e.name === DETAIL_MD,
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
              ce.isFile() && (ce.name === INTENT_MD || ce.name === DETAIL_MD),
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
