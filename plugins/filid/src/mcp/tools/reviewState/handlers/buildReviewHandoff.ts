import { mkdirSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

import { writeFileAtomicallySync } from '@ogham/cross-platform';

import {
  REVIEW_HANDOFF_CLASS_ORDER,
  REVIEW_HANDOFF_MAX_ENTRIES,
  REVIEW_HANDOFF_SCHEMA_VERSION,
  REVIEW_HANDOFF_SCOPE_LIMIT,
  REVIEW_HANDOFF_SYNTHETIC_RULE_IDS,
  REVIEW_STATE_ACTIONS,
  type ReviewHandoffClass,
} from '../../../../constants/reviewState.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import type { ToolDiagnostic } from '../../../../types/toolEnvelope.js';
import { computeReviewSourceHash } from '../hash/computeReviewSourceHash.js';
import { buildHandoffSeed } from '../scope/buildHandoffSeed.js';
import { classifyHandoffFinding } from '../scope/classifyHandoffFinding.js';
import { computeChangedScopeEvidence } from '../scope/computeChangedScopeEvidence.js';
import { foldHandoffScope } from '../scope/foldHandoffScope.js';
import { handoffMessageNamesChangedScope } from '../scope/handoffMessageNamesChangedScope.js';
import { mapEvidenceDiagnosticToHandoffFinding } from '../scope/mapEvidenceDiagnosticToHandoffFinding.js';
import { normalizeHandoffCallerEntry } from '../scope/normalizeHandoffCallerEntry.js';
import { parseHandoffBlock } from '../scope/parseHandoffBlock.js';
import { renderHandoffMarkdown } from '../scope/renderHandoffMarkdown.js';
import type {
  ReviewHandoffEntry,
  ReviewHandoffSeed,
} from '../scope/reviewHandoffSeedSchema.js';
import { assertReviewStatePaths } from '../state/assertReviewStatePaths.js';
import { resolveReviewStatePaths } from '../state/resolveReviewStatePaths.js';
import type {
  ResolvedReviewStateInput,
  ReviewHandoffPayload,
  ReviewScopeViolation,
} from '../state/reviewStateTypes.js';

import { resolvePrepareBaseRef } from './utils/resolvePrepareBaseRef.js';
import { resolvePrepareSettings } from './utils/resolvePrepareSettings.js';

/** Validated handoff input narrowed from the public review-state action union. */
type HandoffInput = Extract<
  ResolvedReviewStateInput,
  { action: typeof REVIEW_STATE_ACTIONS.HANDOFF }
>;

/**
 * Build, self-check, and atomically write one canonical PR handoff section.
 * @param input Validated handoff request with branch and document sync facts.
 * @returns Bounded counts, owner scope, diagnostics, and canonical artifact path.
 * @throws When path guards, rendering self-check, or the final write fails.
 */
export async function buildReviewHandoff(
  input: HandoffInput,
): Promise<ReviewHandoffPayload> {
  const paths = resolveReviewStatePaths(input.projectRoot, input.branchName);
  assertReviewStatePaths(paths);
  mkdirSync(paths.reviewDirectory, { recursive: true });
  let diagnostics: ToolDiagnostic[] = [];
  let seed: ReviewHandoffSeed;
  let counts: Record<ReviewHandoffClass, number>;
  try {
    const baseRef = await resolvePrepareBaseRef(
      input.projectRoot,
      input.baseRef,
    );
    const source = await computeReviewSourceHash(input.projectRoot, baseRef);
    const settings = resolvePrepareSettings(input);
    const computed = await computeChangedScopeEvidence({
      projectRoot: input.projectRoot,
      source,
      generatedPaths: settings.generatedPaths,
      lockfiles: settings.lockfiles,
    });
    diagnostics = computed.evidenceDiagnostics;
    const scope = foldHandoffScope(
      computed.files
        .map((file) => file.owner)
        .filter((owner): owner is string => owner !== null),
      REVIEW_HANDOFF_SCOPE_LIMIT,
    );
    const changedPaths = computed.files.flatMap((file) => [
      file.path,
      file.owner,
    ]);
    const rootFindings = computed.outOfScope.filter(
      (violation) => violation.path === '.' && violation.severity !== 'info',
    );
    const scopedRootFindings = rootFindings.filter((violation) =>
      handoffMessageNamesChangedScope(violation.message, changedPaths),
    );
    const uncertainRootFindings = rootFindings.filter(
      (violation) => !scopedRootFindings.includes(violation),
    );
    const candidateViolations = computed.candidates.map(
      (candidate): ReviewScopeViolation => ({
        source: candidate.source,
        severity: candidate.severity,
        path: candidate.path,
        ruleId: candidate.rule,
        message: candidate.message,
        ...(candidate.certainty ? { certainty: candidate.certainty } : {}),
      }),
    );
    const findings = [...candidateViolations, ...scopedRootFindings].map(
      (violation) => ({
        violation,
        ...classifyHandoffFinding(
          violation,
          computed.ruleScopeById.get(violation.ruleId),
          settings.generatedPaths,
        ),
      }),
    );
    const diagnosticFindings = computed.evidenceDiagnostics.map(
      mapEvidenceDiagnosticToHandoffFinding,
    );
    ({ seed, counts } = buildHandoffSeed({
      snapshotHash: computed.snapshotHash,
      scope,
      documentSync: input.documentSync,
      repaired: input.repaired,
      findings: [...findings, ...diagnosticFindings],
      outOfScopeRoot: uncertainRootFindings,
      callerEntries: input.entries ?? [],
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const callerEntries = (input.entries ?? []).map(
      normalizeHandoffCallerEntry,
    );
    const retainedCallerEntries = callerEntries.slice(
      0,
      REVIEW_HANDOFF_MAX_ENTRIES - 1,
    );
    const validationEntry: ReviewHandoffEntry = normalizeHandoffCallerEntry({
      class: 'document-sync',
      ruleId: REVIEW_HANDOFF_SYNTHETIC_RULE_IDS.HANDOFF_VALIDATE,
      path: '.',
      severity: 'warning',
      certainty: 'unstated',
      note: message,
    });
    const completeFailureEntries = [...callerEntries, validationEntry];
    seed = {
      schema: REVIEW_HANDOFF_SCHEMA_VERSION,
      snapshotHash: null,
      scope: [],
      documentSync: 'failed',
      repaired: input.repaired,
      recorded: [...retainedCallerEntries, validationEntry],
      truncated: callerEntries.length - retainedCallerEntries.length,
    };
    counts = Object.fromEntries(
      REVIEW_HANDOFF_CLASS_ORDER.map((handoffClass) => [
        handoffClass,
        completeFailureEntries.filter(
          (entry) => entry.class === handoffClass,
        ).length,
      ]),
    ) as Record<ReviewHandoffClass, number>;
  }
  const rendered = renderHandoffMarkdown(seed, counts);
  const parsed = parseHandoffBlock(rendered);
  if (
    parsed.diagnostics.length > 0 ||
    parsed.handoff === null ||
    !isDeepStrictEqual(parsed.handoff, seed)
  ) {
    const firstDiagnostic = parsed.diagnostics[0];
    throw new Error(
      firstDiagnostic
        ? `handoff self-check failed: ${firstDiagnostic.code}: ${firstDiagnostic.message}`
        : 'handoff self-check failed',
    );
  }
  writeFileAtomicallySync(paths.handoffPath, rendered);
  return {
    projectRoot: input.projectRoot,
    status: TOOL_STATUSES.OK,
    summary: {
      action: REVIEW_STATE_ACTIONS.HANDOFF,
      recorded: seed.recorded.length,
      truncated: seed.truncated,
      repaired: seed.repaired,
      documentSync: seed.documentSync,
      snapshotHash: seed.snapshotHash,
    },
    data: {
      reviewDirectory: paths.reviewDirectory,
      handoffPath: paths.handoffPath,
      counts,
      scope: seed.scope,
    },
    diagnostics,
  };
}
