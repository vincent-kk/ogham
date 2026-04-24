import {
  type ClassifyInput,
  classifyNode,
} from '../../../../core/tree/organ-classifier/organ-classifier.js';
import type { FractalNavigateInput, FractalNavigateOutput } from '../fractal-navigate.js';

export function handleClassify(input: FractalNavigateInput): FractalNavigateOutput {
  // First check if the entry already has a known type in the provided entries
  const entry = input.entries.find((e) => e.path === input.path);
  if (entry && entry.type !== ('directory' as string)) {
    return { classification: entry.type };
  }

  const dirName =
    input.path
      .split('/')
      .filter((s) => s.length > 0)
      .pop() ?? '';
  const hasIntentMd = entry?.hasIntentMd ?? false;
  const hasDetailMd = entry?.hasDetailMd ?? false;
  const hasIndex = entry?.hasIndex ?? false;

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
