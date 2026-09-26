import { pathForCompare, portableResolve } from '@ogham/cross-platform';

import { ANALYSIS_AXES } from '../../../constants/analysisAxes.js';
import { compareByBytes } from '../../../lib/compareByBytes.js';
import { toProjectRelativePath } from '../../../lib/toProjectRelativePath.js';
import type { VerificationAdapter } from '../../../types/adapters.js';
import type {
  AnalysisCertainty,
  SnapshotDiagnostic,
} from '../../../types/fractal.js';
import type { VerificationFileFacts } from '../../../types/verification.js';
import type { FactsFileState, ProjectFacts } from '../../facts/index.js';

import { factsVerificationClaims } from './factsVerificationClaims.js';

interface VerificationClaim {
  adapterId: string;
  confidence: number;
  path: string;
}

export interface CollectedVerificationClaims {
  adapters: VerificationAdapter[];
  diagnostics: SnapshotDiagnostic[];
  discoveredPathsByAdapter: ReadonlyMap<string, readonly string[]>;
  /** Role and case count of each discovered file the store can answer for. */
  verificationFacts: ReadonlyMap<string, VerificationFileFacts>;
  certainty: AnalysisCertainty;
}

/**
 * Discover the project's verification files and read what the store says.
 *
 * Discovery stays with the adapters — which files are verification is a
 * question about names and paths — while the role and case count of each one
 * come from its facts record. Discovery is narrowed to the facts scan set: a
 * path the scan excludes can never hold a record, so demanding one would leave
 * a diagnostic no action clears. A candidate the store cannot answer for
 * lowers the certainty and is named in a diagnostic, so it never leaves the
 * analysis in silence.
 * @param projectRoot Absolute project root the adapters discover under.
 * @param adapters Verification adapters selected for this project.
 * @param facts One read of the store against the current tree; its scan set
 * bounds which discovered paths become candidates.
 * @param factsStates Each scanned file's state, from that same read.
 * @returns The active adapters, the discovered paths per adapter, the store's
 * answer for each of them, the diagnostics and the discovery certainty.
 */
export async function collectVerificationClaims(
  projectRoot: string,
  adapters: readonly VerificationAdapter[],
  facts: ProjectFacts,
  factsStates: ReadonlyMap<string, FactsFileState>,
): Promise<CollectedVerificationClaims> {
  const claims = new Map<string, VerificationClaim[]>();
  const diagnostics: SnapshotDiagnostic[] = [];
  const activeAdapters: VerificationAdapter[] = [];
  const discoveredPathsByAdapter = new Map<string, string[]>();
  let certainty: AnalysisCertainty = 'exact';

  for (const adapter of adapters)
    try {
      const claim = await adapter.detect(projectRoot);
      if (claim.confidence <= 0) continue;
      activeAdapters.push(adapter);
      discoveredPathsByAdapter.set(adapter.id, []);
      const discovered = new Map<string, string>();
      for (const path of await adapter.discover(projectRoot)) {
        const absolutePath = portableResolve(projectRoot, path);
        if (
          !facts.scannedSet.has(
            toProjectRelativePath(projectRoot, absolutePath),
          )
        )
          continue;
        discovered.set(pathForCompare(absolutePath), absolutePath);
      }
      for (const [key, path] of discovered)
        claims.set(key, [
          ...(claims.get(key) ?? []),
          { adapterId: adapter.id, confidence: claim.confidence, path },
        ]);
    } catch (error) {
      certainty = 'indeterminate';
      diagnostics.push({
        code: 'verification-discovery-failed',
        message: `Verification file discovery failed: ${error instanceof Error ? error.message : String(error)}`,
        affects: ANALYSIS_AXES,
        nextAction:
          'Run again; if it repeats, record this message in your report as a filid defect and continue. Verification evidence stays indeterminate until discovery succeeds.',
      });
    }

  if (activeAdapters.length === 0 && certainty === 'exact')
    certainty = 'unsupported';
  for (const pathClaims of claims.values()) {
    const highestConfidence = Math.max(
      ...pathClaims.map((claim) => claim.confidence),
    );
    const highest = pathClaims.filter(
      (claim) => claim.confidence === highestConfidence,
    );
    const adapterIds = [
      ...new Set(highest.map((claim) => claim.adapterId)),
    ].sort(compareByBytes);
    const path = highest[0].path;
    if (adapterIds.length > 1) {
      certainty = 'indeterminate';
      diagnostics.push({
        code: 'ambiguous-adapter-claim',
        message: `Equal-confidence verification adapters claim ${path}: ${adapterIds.join(', ')}.`,
        path,
        affects: ANALYSIS_AXES,
        nextAction:
          'Set adapters.mode to "explicit" and list exactly one of these adapters in adapters.enabled in .filid/config.json, then run again.',
      });
      continue;
    }
    discoveredPathsByAdapter.get(adapterIds[0])?.push(path);
  }

  for (const paths of discoveredPathsByAdapter.values())
    paths.sort((left, right) =>
      compareByBytes(pathForCompare(left), pathForCompare(right)),
    );
  const stored = factsVerificationClaims(
    projectRoot,
    [...discoveredPathsByAdapter.values()].flat(),
    facts,
    factsStates,
  );
  diagnostics.push(...stored.diagnostics);
  return {
    adapters: activeAdapters,
    diagnostics,
    discoveredPathsByAdapter,
    verificationFacts: stored.verificationFacts,
    certainty:
      stored.diagnostics.length > 0 && certainty === 'exact'
        ? 'indeterminate'
        : certainty,
  };
}
