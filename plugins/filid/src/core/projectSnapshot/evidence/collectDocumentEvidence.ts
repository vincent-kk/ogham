import { readUtf8FileIfExistsSync } from '@ogham/cross-platform/filesystem/read/utf8';
import { portableJoin } from '@ogham/cross-platform/paths';

import { DETAIL_MD, INTENT_MD } from '../../../constants/documentFiles.js';
import type {
  DocumentContractFinding,
  FractalTree,
  SnapshotDiagnostic,
} from '../../../types/fractal.js';
import type { DetailContractDocument } from '../../../types/verification.js';
import {
  countLines,
  validateDetailMd,
  validateIntentMd,
} from '../../rules/documentValidator/index.js';

export interface CollectedDocumentEvidence {
  detailDocuments: DetailContractDocument[];
  diagnostics: SnapshotDiagnostic[];
  filePaths: string[];
}

export function collectDocumentEvidence(
  tree: FractalTree,
): CollectedDocumentEvidence {
  const detailDocuments: DetailContractDocument[] = [];
  const diagnostics: SnapshotDiagnostic[] = [];
  const filePaths: string[] = [];

  for (const node of tree.nodes.values()) {
    const expected = node.type === 'fractal' || node.type === 'hybrid';
    const intentPath = portableJoin(node.path, INTENT_MD);
    const detailPath = portableJoin(node.path, DETAIL_MD);
    const intentContent = readUtf8FileIfExistsSync(intentPath);
    const detailContent = readUtf8FileIfExistsSync(detailPath);
    const findings: DocumentContractFinding[] = [];

    if (intentContent !== null) {
      filePaths.push(intentPath);
      findings.push(
        ...validateIntentMd(intentContent).violations.map((finding) => ({
          document: 'intent' as const,
          ...finding,
        })),
      );
    } else if (expected)
      findings.push({
        document: 'intent',
        rule: 'missing-document',
        message: `${INTENT_MD} is required for ${node.type} node ${node.path}.`,
        severity: 'error',
      });

    if (detailContent !== null) {
      filePaths.push(detailPath);
      findings.push(
        ...validateDetailMd(detailContent).violations.map((finding) => ({
          document: 'detail' as const,
          ...finding,
        })),
      );
      if (node.type !== 'organ')
        detailDocuments.push({
          ownerFractalPath: node.path,
          path: detailPath,
          content: detailContent,
        });
    } else if (expected)
      findings.push({
        document: 'detail',
        rule: 'missing-document',
        message: `${DETAIL_MD} is required for ${node.type} node ${node.path}.`,
        severity: 'error',
      });

    const missing =
      expected && (intentContent === null || detailContent === null);
    node.documentEvidence = {
      intentPath: intentContent === null ? null : intentPath,
      detailPath: detailContent === null ? null : detailPath,
      ...(intentContent === null
        ? {}
        : { intentLines: countLines(intentContent) }),
      status: missing
        ? 'missing'
        : findings.length > 0
          ? 'violations'
          : 'valid',
      findings,
    };
    diagnostics.push(
      ...findings.map((finding) => ({
        code: `${finding.document}-document-contract`,
        message: finding.message,
        path: finding.document === 'intent' ? intentPath : detailPath,
      })),
    );
  }

  return { detailDocuments, diagnostics, filePaths };
}
