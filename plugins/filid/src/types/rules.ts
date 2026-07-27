/**
 * @file rules.ts
 * @description rule-engine의 규칙 정의 및 평가 결과 타입.
 *
 * Rule은 순수 함수 `check`를 통해 RuleViolation[] 을 반환하는 구조이다.
 */
import { RULE_SCOPES } from '../constants/ruleScopes.js';

import type {
  AnalysisCertainty,
  FractalNode,
  FractalTree,
  ProjectSnapshot,
} from './fractal.js';
import type { ScanOptions } from './scan.js';

/** 규칙 위반의 심각도 수준. */
export type RuleSeverity = 'error' | 'warning' | 'info';

/** 규칙이 다루는 관심 영역 분류. */
export type RuleCategory =
  'structure' | 'dependency' | 'documentation' | 'module' | 'verification';

/** 검증 요청이 선택할 수 있는 Filid 1.0 증거 영역. */
export type RuleScope = (typeof RULE_SCOPES)[keyof typeof RULE_SCOPES];

/** 규칙 실행 단위. 생략한 legacy/custom rule은 node 단위로 평가한다. */
export type RuleGranularity = 'node' | 'project';

/** 단일 규칙의 검사 컨텍스트. `Rule.check` 함수에 전달된다. */
export interface RuleContext {
  node: FractalNode;
  tree: FractalTree;
  snapshot?: ProjectSnapshot;
  scanOptions?: ScanOptions;
}

/** 규칙 위반 항목 하나. */
export interface RuleViolation {
  ruleId: string;
  severity: RuleSeverity;
  message: string;
  path: string;
  suggestion?: string;
  certainty?: AnalysisCertainty;
}

/** 단일 규칙 정의. `check` 함수는 순수 함수여야 하며 부작용이 없어야 한다. */
export interface Rule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  enabled: boolean;
  /** Transitional custom rules may omit these and default to nodes/node. */
  scope?: RuleScope;
  granularity?: RuleGranularity;
  check: (context: RuleContext) => RuleViolation[];
}

/** 규칙 집합. */
export interface RuleSet {
  id: string;
  name: string;
  rules: Rule[];
}

/** 전체 규칙 평가 실행 결과. */
export interface RuleEvaluationResult {
  violations: RuleViolation[];
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

/** Rule evaluation options retain the legacy scan limits and add scope filters. */
export interface RuleEvaluationOptions extends ScanOptions {
  scopes?: RuleScope[];
}

export type { BuiltinRuleId } from '../constants/builtinRuleIds.js';

/** 프로젝트별 규칙 오버라이드. `.filid/config.json`의 rules 섹션에서 사용. */
export interface RuleOverride {
  enabled?: boolean;
  severity?: RuleSeverity;
  /** Paths (glob or literal) exempt from this rule. Patterns are matched against `FractalNode.path`. */
  exempt?: string[];
}
