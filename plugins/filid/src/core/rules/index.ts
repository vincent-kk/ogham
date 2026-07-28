// barrel -- re-exports all public APIs

export {
  countLines,
  detectAppendOnly,
  parseBoundaryExemptions,
  validateDetailAcceptanceGroups,
  validateDetailMd,
  validateIntentMd,
} from './documentValidator/index.js';
export {
  validateDependencies,
  validateNode,
  validateStructure,
} from './fractalValidator/index.js';
export {
  applyOverrides,
  evaluateRule,
  evaluateRules,
  getActiveRules,
  loadBuiltinRules,
} from './ruleEngine/index.js';
