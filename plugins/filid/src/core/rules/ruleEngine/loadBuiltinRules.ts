import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import { LEGACY_CRITERIA_LEDGER_RULE } from '../../../constants/legacyCriteriaLedger.js';
import type { Rule, RuleOverride } from '../../../types/rules.js';
import type { AllowedEntry } from '../../infra/configLoader/loaders/configSchemas.js';

import { applyOverrides } from './applyOverrides.js';
import { checkDependencyCycles } from './utils/checkDependencyCycles.js';
import { checkDocumentContract } from './utils/checkDocumentContract.js';
import { checkEntryPointSurface } from './utils/checkEntryPointSurface.js';
import { checkExternalImportBoundary } from './utils/checkExternalImportBoundary.js';
import { checkLegacyCriteriaLedger } from './utils/checkLegacyCriteriaLedger.js';
import { checkMaxDepth } from './utils/checkMaxDepth.js';
import { checkModuleEntryPoint } from './utils/checkModuleEntryPoint.js';
import { checkOrganNoIntentMd } from './utils/checkOrganNoIntentmd.js';
import { checkPureFunctionIsolation } from './utils/checkPureFunctionIsolation.js';
import { checkVerificationPolicy } from './utils/checkVerificationPolicy.js';
import { checkZeroPeerFile } from './utils/checkZeroPeerFile.js';

/**
 * Builds the canonical Filid 1.0 rule roster.
 *
 * The positional parameters remain during the MCP migration seam. Entry-point
 * and route-name parameters are intentionally ignored because adapters now own
 * those facts.
 */
export function loadBuiltinRules(
  overrides?: Record<string, RuleOverride>,
  additionalAllowed?: AllowedEntry[],
  _additionalEntryPoints?: string[],
  _additionalRoutePatterns?: string[],
): Rule[] {
  const rules: Rule[] = [
    {
      id: BUILTIN_RULE_IDS.INTENT_DOCUMENT_CONTRACT,
      name: 'INTENT Document Contract',
      description: 'INTENT documents satisfy the FCA document contract.',
      category: 'documentation',
      severity: 'error',
      enabled: true,
      scope: 'documents',
      granularity: 'node',
      check: checkDocumentContract('intent'),
    },
    {
      id: BUILTIN_RULE_IDS.DETAIL_DOCUMENT_CONTRACT,
      name: 'DETAIL Document Contract',
      description: 'DETAIL documents describe a current public contract.',
      category: 'documentation',
      severity: 'error',
      enabled: true,
      scope: 'documents',
      granularity: 'node',
      check: checkDocumentContract('detail'),
    },
    {
      id: BUILTIN_RULE_IDS.ORGAN_NO_INTENTMD,
      name: 'Organ No INTENT',
      description: 'Organ nodes do not own an independent INTENT document.',
      category: 'structure',
      severity: 'error',
      enabled: true,
      scope: 'nodes',
      granularity: 'node',
      check: checkOrganNoIntentMd,
    },
    {
      id: BUILTIN_RULE_IDS.ENTRY_POINT_SURFACE,
      name: 'Entry Point Surface',
      description: 'Public entry-point surfaces are exactly enumerable.',
      category: 'module',
      severity: 'warning',
      enabled: true,
      scope: 'entry-points',
      granularity: 'node',
      check: checkEntryPointSurface,
    },
    {
      id: BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
      name: 'Module Entry Point',
      description:
        'Every fractal boundary has an adapter-reported entry point.',
      category: 'module',
      severity: 'warning',
      enabled: true,
      scope: 'entry-points',
      granularity: 'node',
      check: checkModuleEntryPoint,
    },
    {
      id: BUILTIN_RULE_IDS.MAX_DEPTH,
      name: 'Max Depth',
      description: 'The fractal tree remains within its configured depth.',
      category: 'structure',
      severity: 'error',
      enabled: true,
      scope: 'nodes',
      granularity: 'node',
      check: checkMaxDepth,
    },
    {
      id: BUILTIN_RULE_IDS.CIRCULAR_DEPENDENCY,
      name: 'Circular Dependency',
      description: 'The snapshot dependency graph contains no cycle.',
      category: 'dependency',
      severity: 'error',
      enabled: true,
      scope: 'dag',
      granularity: 'project',
      check: checkDependencyCycles,
    },
    {
      id: BUILTIN_RULE_IDS.PURE_FUNCTION_ISOLATION,
      name: 'Pure Function Isolation',
      description: 'Pure-function nodes do not depend on stateful fractals.',
      category: 'dependency',
      severity: 'error',
      enabled: true,
      scope: 'dag',
      granularity: 'node',
      check: checkPureFunctionIsolation,
    },
    {
      id: BUILTIN_RULE_IDS.ZERO_PEER_FILE,
      name: 'Zero Peer File',
      description: 'Fractal roots contain only files with an allowed FCA role.',
      category: 'structure',
      severity: 'warning',
      enabled: true,
      scope: 'nodes',
      granularity: 'node',
      check: checkZeroPeerFile(additionalAllowed),
    },
    {
      id: BUILTIN_RULE_IDS.EXTERNAL_IMPORT_BOUNDARY,
      name: 'External Import Boundary',
      description: 'Dependencies cross module boundaries through entry points.',
      category: 'dependency',
      severity: 'error',
      enabled: true,
      scope: 'boundaries',
      granularity: 'project',
      check: (context) =>
        context.snapshot
          ? checkExternalImportBoundary({ snapshot: context.snapshot })
          : [
              {
                ruleId: BUILTIN_RULE_IDS.EXTERNAL_IMPORT_BOUNDARY,
                severity: 'warning',
                message:
                  'Import-boundary evaluation requires a project snapshot.',
                path: context.tree.root,
                certainty: 'indeterminate',
              },
            ],
    },
    {
      id: BUILTIN_RULE_IDS.SPEC_DOCUMENT_CASE_CAP,
      name: 'Spec Document Case Cap',
      description: 'Each spec document stays within its semantic case cap.',
      category: 'verification',
      severity: 'error',
      enabled: true,
      scope: 'verification',
      granularity: 'project',
      check: checkVerificationPolicy('spec-document-case-cap'),
    },
    {
      id: BUILTIN_RULE_IDS.TEST_RECORD_CASE_CAP,
      name: 'Test Record Case Cap',
      description: 'Each test record stays within its semantic case cap.',
      category: 'verification',
      severity: 'error',
      enabled: true,
      scope: 'verification',
      granularity: 'project',
      check: checkVerificationPolicy('test-record-case-cap'),
    },
    {
      id: BUILTIN_RULE_IDS.SPEC_FRAGMENTATION,
      name: 'Spec Fragmentation',
      description: 'Spec documents are not split to evade the case cap.',
      category: 'verification',
      severity: 'error',
      enabled: true,
      scope: 'verification',
      granularity: 'project',
      check: checkVerificationPolicy('spec-fragmentation'),
    },
    {
      id: BUILTIN_RULE_IDS.SPEC_CONTRACT_LINK,
      name: 'Spec Contract Link',
      description: 'Multiple spec documents link to explicit contract groups.',
      category: 'verification',
      severity: 'warning',
      enabled: true,
      scope: 'verification',
      granularity: 'project',
      check: checkVerificationPolicy('spec-contract-link'),
    },
    {
      id: BUILTIN_RULE_IDS.LEGACY_CRITERIA_LEDGER,
      name: LEGACY_CRITERIA_LEDGER_RULE.NAME,
      description: LEGACY_CRITERIA_LEDGER_RULE.DESCRIPTION,
      category: LEGACY_CRITERIA_LEDGER_RULE.CATEGORY,
      severity: LEGACY_CRITERIA_LEDGER_RULE.SEVERITY,
      enabled: true,
      scope: LEGACY_CRITERIA_LEDGER_RULE.SCOPE,
      granularity: LEGACY_CRITERIA_LEDGER_RULE.GRANULARITY,
      check: checkLegacyCriteriaLedger,
    },
  ];
  return overrides ? applyOverrides(rules, overrides) : rules;
}
