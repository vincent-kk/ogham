import { readUtf8FileIfExistsSync } from '@ogham/cross-platform/filesystem/read/utf8';
import { portableIsAbsolute, portableJoin } from '@ogham/cross-platform/paths';

import { DETAIL_MD, INTENT_MD } from '../../../constants/documentFiles.js';
import type { OrganExemptionDeclaration } from '../../../types/documents.js';
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

/**
 * Resolve each declared organ path against the fractal that declared it, so the
 * rule engine compares absolute paths without re-reading the document.
 */
function normalizeExemptions(
  ownerPath: string,
  exemptions: readonly OrganExemptionDeclaration[],
): OrganExemptionDeclaration[] {
  return exemptions.map((exemption) => ({
    ...exemption,
    organPath: portableIsAbsolute(exemption.organPath)
      ? exemption.organPath
      : portableJoin(ownerPath, exemption.organPath),
  }));
}

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

    let organExemptions: OrganExemptionDeclaration[] | undefined;
    if (detailContent !== null) {
      filePaths.push(detailPath);
      const detail = validateDetailMd(detailContent);
      findings.push(
        ...detail.violations.map((finding) => ({
          document: 'detail' as const,
          ...finding,
        })),
      );
      if (detail.organExemptions.length > 0)
        organExemptions = normalizeExemptions(
          node.path,
          detail.organExemptions,
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
      ...(organExemptions ? { organExemptions } : {}),
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
