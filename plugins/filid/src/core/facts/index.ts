export { FileFactsSchema } from './schema/fileFactsSchema.js';
export type {
  FactsProvenance,
  FactsReference,
  FactsResolved,
  FileFacts,
} from './schema/fileFactsSchema.js';
export { StoredFactsRecordSchema } from './schema/storedFactsRecordSchema.js';
export type { StoredFactsRecord } from './schema/storedFactsRecordSchema.js';

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
export type {
  FactsShard,
  FactsStoreContents,
} from './store/readFactsStore.js';
export { writeFactsShardFile } from './store/writeFactsShardFile.js';
export { readEpochSnapshot } from './store/readEpochSnapshot.js';
export { writeEpochSnapshot } from './store/writeEpochSnapshot.js';

export { readSubmissionFile } from './ingest/readSubmissionFile.js';
export type { SubmissionFileRead } from './ingest/readSubmissionFile.js';
export { parseSubmittedRecords } from './ingest/parseSubmittedRecords.js';
export type {
  ParsedSubmission,
  SubmissionParse,
} from './ingest/parseSubmittedRecords.js';

export { validateFactsRecord } from './validation/validateFactsRecord.js';
export { hashProjectFile } from './validation/utils/hashProjectFile.js';
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

export { recordEpochDrift } from './stability/recordEpochDrift.js';
export type { EpochDriftVerdict } from './stability/recordEpochDrift.js';
