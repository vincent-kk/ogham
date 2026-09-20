export { FileFactsSchema } from './schema/fileFactsSchema.js';
export type {
  FactsProvenance,
  FactsReference,
  FactsResolved,
  FileFacts,
} from './schema/fileFactsSchema.js';
export { StoredFactsRecordSchema } from './schema/storedFactsRecordSchema.js';
export type { StoredFactsRecord } from './schema/storedFactsRecordSchema.js';

export { defaultFactsCovers } from './scope/defaultFactsCovers.js';
export { resolveFactsScope } from './scope/resolveFactsScope.js';
export type { FactsScope } from './scope/resolveFactsScope.js';

export { collectDefaultResolutionInputs } from './epoch/collectDefaultResolutionInputs.js';
export { createDeclaredInputHasher } from './epoch/createDeclaredInputHasher.js';
export { computeResolutionEpoch } from './epoch/computeResolutionEpoch.js';
export type {
  ResolutionEpochSnapshot,
  ResolutionInputDigest,
} from './epoch/computeResolutionEpoch.js';
export { diffEpochSnapshots } from './epoch/diffEpochSnapshots.js';
export type { EpochDifference } from './epoch/diffEpochSnapshots.js';

export { resolveFactsStorePaths } from './store/factsStorePaths.js';
export type { FactsStorePaths } from './store/factsStorePaths.js';
export { readFactsStore } from './store/readFactsStore.js';
export type { FactsStoreContents } from './store/readFactsStore.js';
export { readShardDirectory } from './store/readShardDirectory.js';
export type { FactsShard } from './store/readShardDirectory.js';
export { writeFactsShardFile } from './store/writeFactsShardFile.js';
export { readEpochSnapshot } from './store/readEpochSnapshot.js';
export { writeEpochSnapshot } from './store/writeEpochSnapshot.js';
export { writeExtractionList } from './store/writeExtractionList.js';
export type { ExtractionListWrite } from './store/writeExtractionList.js';

export { readSubmissionFile } from './ingest/readSubmissionFile.js';
export type { SubmissionFileRead } from './ingest/readSubmissionFile.js';
export { parseSubmittedRecords } from './ingest/parseSubmittedRecords.js';
export type {
  ParsedSubmission,
  SubmissionParse,
} from './ingest/parseSubmittedRecords.js';

export { validateFactsRecord } from './validation/validateFactsRecord.js';
export { hashProjectFile } from './validation/utils/hashProjectFile.js';
export { isProjectFilePathValid } from './validation/utils/isProjectFilePathValid.js';
export { locateSourceText } from './validation/utils/locateSourceText.js';
export { splitSourceLines } from './validation/utils/splitSourceLines.js';
export type { StoredRejection } from './schema/storedFactsRecordSchema.js';
export { buildFactsRejection } from './validation/utils/buildFactsRejection.js';
export { checkDeclaredInputs } from './validation/utils/checkDeclaredInputs.js';
export type { DeclaredInputVerdict } from './validation/utils/checkDeclaredInputs.js';
export type { ProjectFileDigest } from './validation/utils/hashProjectFile.js';
export type {
  FactsRejection,
  FactsValidationContext,
  FactsValidationResult,
} from './validation/types/factsValidationTypes.js';

export { classifyFactsFile } from './state/classifyFactsFile.js';
export type {
  FactsFileEvidence,
  FactsFileState,
} from './state/classifyFactsFile.js';
export { selectUnknownFiles } from './state/selectUnknownFiles.js';

export { adjudicateItem } from './sideTable/adjudicateItem.js';
export { agreedNonReferences } from './attested/agreedNonReferences.js';
export { findUnaccountedLines } from './attested/findUnaccountedLines.js';
export { resolveAttestation } from './attested/resolveAttestation.js';
export type { AttestationResolution } from './attested/resolveAttestation.js';
export { comparePendingEdges } from './pending/comparePendingEdges.js';
export type { AttestationDifference } from './pending/comparePendingEdges.js';
export { readPendingStore } from './pending/readPendingStore.js';
export type {
  PendingStoreContents,
} from './pending/readPendingStore.js';
export { PendingAttestationSchema } from './pending/pendingPageSchema.js';
export type { PendingAttestation } from './pending/pendingPageSchema.js';
export { writeShardPages } from './store/writeShardPages.js';
export type {
  ShardPageUpdate,
  ShardWriteOutcome,
} from './store/writeShardPages.js';
export { isOpenAdjudication } from './sideTable/isOpenAdjudication.js';
export { normalizeActor } from './sideTable/normalizeActor.js';
export { readAdjudicationTable } from './sideTable/readAdjudicationTable.js';
export type { AdjudicationTableContents } from './sideTable/readAdjudicationTable.js';
export { AdjudicationPageSchema } from './sideTable/adjudicationTableSchema.js';
export type { AdjudicationPage } from './sideTable/adjudicationTableSchema.js';
export { computeLineDigest } from './sideTable/utils/computeLineDigest.js';
export { compareReferences, originOf } from './sideTable/compareReferences.js';
export { detectShrunkReferences } from './sideTable/detectShrunkReferences.js';
export type { ShrunkReference } from './sideTable/detectShrunkReferences.js';
export type {
  ComparableReference,
  ReferenceComparison,
} from './sideTable/compareReferences.js';
export { selectValidReferences } from './sideTable/selectValidReferences.js';
export type { ValidReference } from './sideTable/selectValidReferences.js';
export { writeAdjudicationPages } from './sideTable/writeAdjudicationPages.js';
export type {
  AdjudicationPageUpdate,
  AdjudicationWriteOutcome,
} from './sideTable/writeAdjudicationPages.js';
export type { AdjudicationOutcome } from './sideTable/adjudicateItem.js';
export type {
  AdjudicationDecision,
  AdjudicationItem,
  AdjudicationKey,
  AdjudicationOrigin,
  AdjudicationState,
} from './sideTable/types/adjudicationTypes.js';

export { recordEpochDrift } from './stability/recordEpochDrift.js';
export type { EpochDriftVerdict } from './stability/recordEpochDrift.js';
