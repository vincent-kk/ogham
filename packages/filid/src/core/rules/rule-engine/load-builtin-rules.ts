import { BUILTIN_RULE_IDS } from '../../../constants/builtin-rule-ids.js';
import type { Rule, RuleOverride } from '../../../types/rules.js';
import type { AllowedEntry } from '../../infra/config-loader/loaders/config-schemas.js';
import { applyOverrides } from './apply-overrides.js';
import { checkCircularDependency } from './utils/check-circular-dependency.js';
import { checkIndexBarrelPattern } from './utils/check-index-barrel-pattern.js';
import { checkMaxDepth } from './utils/check-max-depth.js';
import { checkModuleEntryPoint } from './utils/check-module-entry-point.js';
import { checkNamingConvention } from './utils/check-naming-convention.js';
import { checkOrganNoIntentMd } from './utils/check-organ-no-intentmd.js';
import { checkPureFunctionIsolation } from './utils/check-pure-function-isolation.js';
import { checkZeroPeerFile } from './utils/check-zero-peer-file.js';

/**
 * 8개 내장 규칙 인스턴스를 생성하여 반환한다.
 * overrides가 전달되면 enabled/severity/exempt를 프로젝트별로 재정의한다.
 * additionalAllowed의 객체형 엔트리는 `paths` glob이 현재 노드 경로와 일치할 때만 basename을 허용한다.
 */
export function loadBuiltinRules(
  overrides?: Record<string, RuleOverride>,
  additionalAllowed?: AllowedEntry[],
): Rule[] {
  const rules: Rule[] = [
    // 1. naming-convention: 디렉토리명이 kebab-case 또는 camelCase여야 한다
    {
      id: BUILTIN_RULE_IDS.NAMING_CONVENTION,
      name: 'Naming Convention',
      description:
        'Directory and file names must follow kebab-case or camelCase.',
      category: 'naming',
      severity: 'warning',
      enabled: true,
      check: checkNamingConvention,
    },

    // 2. organ-no-intentmd: organ 노드에 INTENT.md가 없어야 한다
    {
      id: BUILTIN_RULE_IDS.ORGAN_NO_INTENTMD,
      name: 'Organ No INTENT.md',
      description: 'Organ nodes must not contain INTENT.md.',
      category: 'structure',
      severity: 'error',
      enabled: true,
      check: checkOrganNoIntentMd,
    },

    // 3. index-barrel-pattern: fractal 노드의 index.ts가 순수 barrel이어야 한다
    {
      id: BUILTIN_RULE_IDS.INDEX_BARREL_PATTERN,
      name: 'Index Barrel Pattern',
      description:
        'index.ts in fractal nodes must follow the pure barrel (re-export only) pattern.',
      category: 'index',
      severity: 'warning',
      enabled: true,
      check: checkIndexBarrelPattern,
    },

    // 4. module-entry-point: 모든 fractal 노드에 index.ts 또는 main.ts가 있어야 한다
    {
      id: BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
      name: 'Module Entry Point',
      description:
        'Every fractal node must have either index.ts or main.ts as an entry point.',
      category: 'module',
      severity: 'warning',
      enabled: true,
      check: checkModuleEntryPoint,
    },

    // 5. max-depth: 트리 깊이가 maxDepth를 초과하면 안 된다
    {
      id: BUILTIN_RULE_IDS.MAX_DEPTH,
      name: 'Max Depth',
      description:
        'The depth of the fractal tree must not exceed the maximum allowed depth.',
      category: 'structure',
      severity: 'error',
      enabled: true,
      check: checkMaxDepth,
    },

    // 6. circular-dependency: 순환 의존 감지 (placeholder - 빈 배열 반환)
    {
      id: BUILTIN_RULE_IDS.CIRCULAR_DEPENDENCY,
      name: 'Circular Dependency',
      description: 'There must be no circular dependencies between modules.',
      category: 'dependency',
      severity: 'error',
      enabled: true,
      check: checkCircularDependency,
    },

    // 7. pure-function-isolation: pure-function 노드는 부작용이 없어야 한다
    {
      id: BUILTIN_RULE_IDS.PURE_FUNCTION_ISOLATION,
      name: 'Pure Function Isolation',
      description:
        'pure-function nodes must not import parent fractal modules.',
      category: 'dependency',
      severity: 'error',
      enabled: true,
      check: checkPureFunctionIsolation,
    },

    // 8. zero-peer-file: 카테고리 기반 예외 시스템 (static + eponymous + framework)
    {
      id: BUILTIN_RULE_IDS.ZERO_PEER_FILE,
      name: 'Zero Peer File',
      description:
        'Fractal roots must not contain standalone peer files beyond the allowed categories (index/main, documentation, eponymous, framework reserved).',
      category: 'structure',
      severity: 'warning',
      enabled: true,
      check: checkZeroPeerFile(additionalAllowed),
    },
  ];
  return overrides ? applyOverrides(rules, overrides) : rules;
}
