import { portableJoin } from '@ogham/cross-platform';

import { DETAIL_MD, INTENT_MD } from '../../../constants/documentFiles.js';
import type { ContextDocumentRef } from '../../../types/context.js';
import type { FractalNode } from '../../../types/fractal.js';

/**
 * Project snapshot document evidence without treating an optional DETAIL as missing.
 * @param node - Classified owner with optional collected document evidence.
 * @returns Document paths and status; never reads the filesystem.
 */
export function toContextDocumentRef(node: FractalNode): ContextDocumentRef {
  const evidence = node.documentEvidence;
  if (evidence)
    return {
      fractalPath: node.path,
      intentPath: evidence.intentPath,
      detailPath: evidence.detailPath,
      ...(evidence.intentLines === undefined
        ? {}
        : { intentLines: evidence.intentLines }),
      documentStatus: evidence.status,
    };

  return {
    fractalPath: node.path,
    intentPath: node.hasIntentMd ? portableJoin(node.path, INTENT_MD) : null,
    detailPath: node.hasDetailMd ? portableJoin(node.path, DETAIL_MD) : null,
    documentStatus: node.hasIntentMd ? 'valid' : 'missing',
  };
}
