/**
 * @file rule-engine.ts
 * @description Facade — re-exports 8개 내장 FCA 규칙 로더 및 평가기.
 *
 * 내부 파일은 각각 단일 함수를 담고 있으며, 외부 호출자는 이 파일을 통해
 * 공개 API(loadBuiltinRules, applyOverrides, evaluateRule, evaluateRules,
 * getActiveRules)에 접근한다. 8개 개별 rule check 구현은 utils/check-*.ts
 * 에 분리되어 있다.
 */
export { applyOverrides } from './apply-overrides.js';
export { evaluateRule } from './evaluate-rule.js';
export { evaluateRules } from './evaluate-rules.js';
export { getActiveRules } from './get-active-rules.js';
export { loadBuiltinRules } from './load-builtin-rules.js';
