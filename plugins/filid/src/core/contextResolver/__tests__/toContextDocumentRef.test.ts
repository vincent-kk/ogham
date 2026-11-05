import { describe, expect, it } from 'vitest';

import type { FractalNode } from '../../../types/fractal.js';
import { toContextDocumentRef } from '../documents/toContextDocumentRef.js';

describe('toContextDocumentRef without document evidence', () => {
  it.each([
    { hasIntentMd: true, documentStatus: 'valid' },
    { hasIntentMd: false, documentStatus: 'missing' },
  ])(
    'returns $documentStatus when hasIntentMd is $hasIntentMd',
    ({ hasIntentMd, documentStatus }) => {
      const node: FractalNode = {
        path: '/root/module',
        name: 'module',
        type: 'fractal',
        parent: '/root',
        parentFractalPath: '/root',
        children: [],
        childFractalPaths: [],
        organs: [],
        organPaths: [],
        hasIntentMd,
        hasDetailMd: false,
        entryPoints: [],
        peerFiles: [],
        hasIndex: true,
        hasMain: false,
        depth: 1,
        metadata: {},
      };

      expect(toContextDocumentRef(node)).toEqual({
        fractalPath: '/root/module',
        intentPath: hasIntentMd ? '/root/module/INTENT.md' : null,
        detailPath: null,
        documentStatus,
      });
    },
  );
});
