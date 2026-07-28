// barrel -- re-exports all public APIs

export {
  buildChain,
  findBoundary,
} from './boundaryDetector/index.js';
export type {
  ChainResult,
} from './boundaryDetector/index.js';
export {
  buildFractalTree,
  findNode,
  getAncestors,
  getDescendants,
  getFractalsUnderOrgans,
  scanProject,
  shouldExclude,
} from './fractalTree/index.js';
export type {
  NodeEntry,
} from './fractalTree/index.js';
export {
  KNOWN_ORGAN_DIR_NAMES,
  classifyNode,
  isInfraOrgDirectoryByPattern,
} from './organClassifier/index.js';
export type {
  ClassifyInput,
} from './organClassifier/index.js';
