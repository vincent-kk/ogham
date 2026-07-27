/**
 * @file ruleEngine.ts
 * @description Facade — re-exports the canonical 15-rule loader and evaluators.
 *
 * 내부 파일은 각각 단일 함수를 담고 있으며, 외부 호출자는 이 파일을 통해
 * 공개 API(loadBuiltinRules, applyOverrides, evaluateRule, evaluateRules,
 * getActiveRules)에 접근한다. Evidence-specific checks remain internal.
 */
export { applyOverrides } from './applyOverrides.js';
export { evaluateRule } from './evaluateRule.js';
export { evaluateRules } from './evaluateRules.js';
export { getActiveRules } from './getActiveRules.js';
export { loadBuiltinRules } from './loadBuiltinRules.js';
