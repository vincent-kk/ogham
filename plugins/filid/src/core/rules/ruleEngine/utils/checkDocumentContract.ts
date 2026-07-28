import { BUILTIN_RULE_IDS } from '../../../../constants/builtinRuleIds.js';
import type { DocumentContractFinding } from '../../../../types/fractal.js';
import type {
  Rule,
  RuleContext,
  RuleViolation,
} from '../../../../types/rules.js';

type DocumentKind = DocumentContractFinding['document'];

function ruleIdFor(document: DocumentKind): string {
  return document === 'intent'
    ? BUILTIN_RULE_IDS.INTENT_DOCUMENT_CONTRACT
    : BUILTIN_RULE_IDS.DETAIL_DOCUMENT_CONTRACT;
}

function isPresent(context: RuleContext, document: DocumentKind): boolean {
  return document === 'intent'
    ? context.node.hasIntentMd
    : context.node.hasDetailMd;
}

export function checkDocumentContract(document: DocumentKind): Rule['check'] {
  return (context: RuleContext): RuleViolation[] => {
    const { node } = context;
    if (node.type === 'organ' || node.type === 'pure-function') return [];
    const findings =
      node.documentEvidence?.findings.filter(
        (finding) => finding.document === document,
      ) ?? [];
    const violations = findings.map((finding) => ({
      ruleId: ruleIdFor(document),
      severity: finding.severity,
      message: finding.message,
      path:
        document === 'intent'
          ? (node.documentEvidence?.intentPath ?? node.path)
          : (node.documentEvidence?.detailPath ?? node.path),
    }));
    if (
      node.type !== 'fractal' ||
      isPresent(context, document) ||
      findings.length > 0
    )
      return violations;
    return [
      {
        ruleId: ruleIdFor(document),
        severity: 'error',
        message: `Fractal "${node.name}" is missing its ${document} contract document.`,
        path: node.path,
      },
      ...violations,
    ];
  };
}
