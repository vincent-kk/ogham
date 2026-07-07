import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  type ClassifyInput,
  classifyNode,
} from '../../../../core/tree/organClassifier/organClassifier.js';
import type {
  FractalNavigateInput,
  FractalNavigateOutput,
} from '../fractalNavigate.js';

export function handleClassify(
  input: FractalNavigateInput,
): FractalNavigateOutput {
  // First check if the entry already has a known type in the provided entries
  const entry = input.entries.find((e) => e.path === input.path);
  if (entry && entry.type !== ('directory' as string))
    return { classification: entry.type };

  const dirName =
    input.path
      .split('/')
      .filter((s) => s.length > 0)
      .pop() ?? '';
  let hasIntentMd = entry?.hasIntentMd ?? false;
  let hasDetailMd = entry?.hasDetailMd ?? false;
  const hasIndex = entry?.hasIndex ?? false;

  // Entries lack the target (e.g. classify called with entries: []) — consult
  // the filesystem so classification priority 1-2 (INTENT.md/DETAIL.md →
  // fractal) still holds instead of silently defaulting to false.
  if (!entry && existsSync(input.path)) {
    hasIntentMd = existsSync(join(input.path, 'INTENT.md'));
    hasDetailMd = existsSync(join(input.path, 'DETAIL.md'));
  }

  // entries에서 실제 계산 (hardcode 제거)
  const immediateChildren = input.entries.filter(
    (e) =>
      e.path !== input.path &&
      e.path.startsWith(input.path + '/') &&
      e.path.replace(input.path + '/', '').indexOf('/') === -1,
  );
  const hasFractalChildren = immediateChildren.some(
    (c) => c.type === 'fractal' || c.type === 'pure-function',
  );
  const isLeafDirectory = immediateChildren.length === 0;

  const classifyInput: ClassifyInput = {
    dirName,
    hasIntentMd,
    hasDetailMd,
    hasFractalChildren,
    isLeafDirectory,
    hasIndex,
  };
  const result = classifyNode(classifyInput);
  return { classification: result };
}
