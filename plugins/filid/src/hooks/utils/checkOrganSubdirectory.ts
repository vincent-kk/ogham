import { existsSync } from 'node:fs';
import * as path from 'node:path';

import { DETAIL_MD, INTENT_MD } from '../../constants/documentFiles.js';

import { isOrganByStructure } from './organStructureChecker.js';

export function checkOrganSubdirectory(
  segments: string[],
  cwd: string,
): string[] {
  // 검사 2: organ 내부 하위 디렉토리 생성 (organ은 flat이어야 한다)
  let organIdx = -1;
  let organSegment = '';
  let dirSoFar = cwd;
  for (let i = 0; i < segments.length; i++) {
    dirSoFar = path.join(dirSoFar, segments[i]);
    if (isOrganByStructure(dirSoFar)) {
      organIdx = i;
      organSegment = segments[i];
      break;
    }
  }
  if (organIdx === -1 || organIdx >= segments.length - 1) return [];

  // FCA: "Fractal nodes MAY exist inside organ directories." A declared
  // sub-fractal (INTENT.md/DETAIL.md) below the organ legalises the nesting.
  let below = dirSoFar;
  for (let i = organIdx + 1; i < segments.length; i++) {
    below = path.join(below, segments[i]);
    if (
      existsSync(path.join(below, INTENT_MD)) ||
      existsSync(path.join(below, DETAIL_MD))
    )
      return [];
  }

  return [
    `Attempting to create a subdirectory inside organ directory "${organSegment}". ` +
      `Organ directories should remain flat leaf compartments without nested subdirectories.`,
  ];
}
