/**
 * @file rule-engine.ts
 * @description 내장 규칙 로드 및 평가 엔진.
 *
 * 8개의 내장 규칙을 제공하고 FractalTree에 대해 규칙을 평가한다.
 * loadBuiltinRules(overrides?)를 통해 .filid/config.json 기반 오버라이드를 지원한다.
 */
import type { FractalTree } from '../../../types/fractal.js';
import type {
  Rule,
  RuleContext,
  RuleEvaluationResult,
  RuleOverride,
  RuleViolation,
} from '../../../types/rules.js';
import { BUILTIN_RULE_IDS } from '../../../types/rules.js';
import type { ScanOptions } from '../../../types/scan.js';
import { DEFAULT_SCAN_OPTIONS } from '../../../types/scan.js';
import { ALLOWED_FRACTAL_ROOT_FILES } from '../../utils/peer-file-registry.js';

// kebab-case: 소문자, 숫자, 하이픈으로만 구성
const KEBAB_CASE_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
// camelCase: 소문자로 시작, 대문자 혼용 가능
const CAMEL_CASE_RE = /^[a-z][a-zA-Z0-9]*$/;

function isValidNaming(name: string): boolean {
  return KEBAB_CASE_RE.test(name) || CAMEL_CASE_RE.test(name);
}

/**
 * 프로젝트별 오버라이드를 내장 규칙에 적용한다.
 * Rule 객체의 enabled/severity 필드와 check() 내부 violation severity를 모두 동기화한다.
 */
export function applyOverrides(
  rules: Rule[],
  overrides: Record<string, RuleOverride>,
): Rule[] {
  return rules.map((rule) => {
    const override = overrides[rule.id];
    if (!override) return rule;
    const newEnabled = override.enabled ?? rule.enabled;
    const newSeverity = override.severity ?? rule.severity;
    if (newEnabled === rule.enabled && newSeverity === rule.severity)
      return rule;
    const originalCheck = rule.check;
    return {
      ...rule,
      enabled: newEnabled,
      severity: newSeverity,
      check:
        newSeverity !== rule.severity
          ? (ctx: RuleContext): RuleViolation[] =>
              originalCheck(ctx).map((v) => ({ ...v, severity: newSeverity }))
          : originalCheck,
    };
  });
}

/**
 * 8개 내장 규칙 인스턴스를 생성하여 반환한다.
 * overrides가 전달되면 enabled/severity를 프로젝트별로 재정의한다.
 */
export function loadBuiltinRules(
  overrides?: Record<string, RuleOverride>,
  additionalAllowed?: string[],
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
      check(context: RuleContext): RuleViolation[] {
        const { node } = context;
        if (!isValidNaming(node.name)) {
          return [
            {
              ruleId: BUILTIN_RULE_IDS.NAMING_CONVENTION,
              severity: 'warning',
              message: `Directory name "${node.name}" does not follow kebab-case or camelCase conventions.`,
              path: node.path,
              suggestion: `Rename "${node.name}" to kebab-case (e.g. my-module) or camelCase (e.g. myModule).`,
            },
          ];
        }
        return [];
      },
    },

    // 2. organ-no-intentmd: organ 노드에 INTENT.md가 없어야 한다
    {
      id: BUILTIN_RULE_IDS.ORGAN_NO_INTENTMD,
      name: 'Organ No INTENT.md',
      description: 'Organ nodes must not contain INTENT.md.',
      category: 'structure',
      severity: 'error',
      enabled: true,
      check(context: RuleContext): RuleViolation[] {
        const { node } = context;
        if (node.type === 'organ' && node.hasIntentMd) {
          return [
            {
              ruleId: BUILTIN_RULE_IDS.ORGAN_NO_INTENTMD,
              severity: 'error',
              message: `Organ directory "${node.name}" contains INTENT.md. Organ nodes must not have standalone documentation.`,
              path: node.path,
              suggestion:
                'Remove INTENT.md or reclassify this directory as a fractal node.',
            },
          ];
        }
        return [];
      },
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
      check(context: RuleContext): RuleViolation[] {
        const { node } = context;
        // fractal/hybrid 노드에만 적용, index가 있어야 함
        if (node.type !== 'fractal' && node.type !== 'hybrid') return [];
        if (!node.hasIndex) return [];

        // metadata에 barrelPattern이 있으면 활용
        const barrelPattern = node.metadata['barrelPattern'] as
          | { isPureBarrel: boolean; declarationCount: number }
          | undefined;

        if (
          barrelPattern &&
          !barrelPattern.isPureBarrel &&
          barrelPattern.declarationCount > 0
        ) {
          return [
            {
              ruleId: BUILTIN_RULE_IDS.INDEX_BARREL_PATTERN,
              severity: 'warning',
              message: `"${node.name}/index.ts" contains ${barrelPattern.declarationCount} direct declarations and does not follow the pure barrel pattern.`,
              path: node.path,
              suggestion:
                'Move direct declarations into separate files and re-export them from index.ts.',
            },
          ];
        }
        return [];
      },
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
      check(context: RuleContext): RuleViolation[] {
        const { node } = context;
        if (node.type !== 'fractal' && node.type !== 'hybrid') return [];
        if (!node.hasIndex && !node.hasMain) {
          return [
            {
              ruleId: BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
              severity: 'warning',
              message: `Fractal module "${node.name}" does not have an entry point (index.ts or main.ts).`,
              path: node.path,
              suggestion:
                'Create index.ts or main.ts and define the public API of the module there.',
            },
          ];
        }
        return [];
      },
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
      check(context: RuleContext): RuleViolation[] {
        const { node, scanOptions } = context;
        const maxDepth = scanOptions?.maxDepth ?? DEFAULT_SCAN_OPTIONS.maxDepth;
        if (node.depth > maxDepth) {
          return [
            {
              ruleId: BUILTIN_RULE_IDS.MAX_DEPTH,
              severity: 'error',
              message: `The depth of "${node.name}" (${node.depth}) exceeds the maximum allowed depth (${maxDepth}).`,
              path: node.path,
              suggestion:
                'Flatten the directory structure or merge related modules.',
            },
          ];
        }
        return [];
      },
    },

    // 6. circular-dependency: 순환 의존 감지 (placeholder - 빈 배열 반환)
    {
      id: BUILTIN_RULE_IDS.CIRCULAR_DEPENDENCY,
      name: 'Circular Dependency',
      description: 'There must be no circular dependencies between modules.',
      category: 'dependency',
      severity: 'error',
      enabled: true,
      check(_context: RuleContext): RuleViolation[] {
        // Phase 2 placeholder: 순환 의존 감지는 project-analyzer 레벨에서 수행
        // 개별 노드 컨텍스트에서는 전체 의존 그래프가 없으므로 빈 배열 반환
        return [];
      },
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
      check(context: RuleContext): RuleViolation[] {
        const { node, tree } = context;
        if (node.type !== 'pure-function') return [];

        // metadata에 dependencies가 있으면 확인
        const deps = node.metadata['dependencies'] as string[] | undefined;
        if (!deps || deps.length === 0) return [];

        const violations: RuleViolation[] = [];

        for (const dep of deps) {
          // 의존 대상이 트리에 있고 fractal 타입이면 위반
          const depNode = tree.nodes.get(dep);
          if (
            depNode &&
            (depNode.type === 'fractal' || depNode.type === 'hybrid')
          ) {
            violations.push({
              ruleId: BUILTIN_RULE_IDS.PURE_FUNCTION_ISOLATION,
              severity: 'error',
              message: `Pure-function node "${node.name}" depends on fractal module "${depNode.name}".`,
              path: node.path,
              suggestion: `Move the dependency under "${depNode.name}" as an organ node or remove the dependency.`,
            });
          }
        }

        return violations;
      },
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
      check(context: RuleContext): RuleViolation[] {
        const { node } = context;
        if (node.type !== 'fractal' && node.type !== 'hybrid') return [];

        const peerFiles = node.metadata['peerFiles'] as string[] | undefined;
        if (!peerFiles || peerFiles.length === 0) return [];

        // Compose the full allowed set for THIS node
        const allowed = new Set(ALLOWED_FRACTAL_ROOT_FILES);

        // Category: eponymous file (max 1, auto-detected by scanProject)
        const eponymous = node.metadata['eponymousFile'] as
          | string
          | null
          | undefined;
        if (eponymous) allowed.add(eponymous);

        // Category: framework reserved files (auto-detected from package.json)
        const fwFiles = node.metadata['frameworkReservedFiles'] as
          | string[]
          | undefined;
        if (fwFiles) for (const f of fwFiles) allowed.add(f);

        // Category: additional-allowed from .filid/config.json
        if (additionalAllowed)
          for (const f of additionalAllowed) allowed.add(f);

        const disallowed = peerFiles.filter((f) => !allowed.has(f));
        if (disallowed.length === 0) return [];

        return disallowed.map((file) => ({
          ruleId: BUILTIN_RULE_IDS.ZERO_PEER_FILE,
          severity: 'warning' as const,
          message: `Fractal root "${node.name}" contains peer file "${file}" not in any allowed category. Promote it to a sub-fractal directory.`,
          path: node.path,
          suggestion: `Create a subdirectory for "${file}" or add it to .filid/config.json additional-allowed if it belongs at the root.`,
        }));
      },
    },
  ];
  return overrides ? applyOverrides(rules, overrides) : rules;
}

/**
 * 활성화된 규칙만 필터링하여 반환한다.
 *
 * @param rules - 전체 규칙 목록
 * @returns enabled가 true인 규칙 목록
 */
export function getActiveRules(rules: Rule[]): Rule[] {
  return rules.filter((r) => r.enabled);
}

/**
 * 단일 규칙을 단일 노드에 적용한다.
 *
 * @param rule - 적용할 규칙
 * @param context - 규칙 컨텍스트
 * @returns 위반 목록 (없으면 빈 배열)
 */
export function evaluateRule(
  rule: Rule,
  context: RuleContext,
): RuleViolation[] {
  if (!rule.enabled) return [];
  try {
    return rule.check(context);
  } catch {
    return [];
  }
}

/**
 * FractalTree의 모든 노드에 대해 활성화된 규칙을 평가한다.
 *
 * @param tree - 검증할 프랙탈 트리
 * @param rules - 평가할 규칙 목록 (생략 시 내장 규칙 사용)
 * @param options - 스캔 옵션 (maxDepth 등)
 * @returns 전체 평가 결과
 */
export function evaluateRules(
  tree: FractalTree,
  rules?: Rule[],
  options?: ScanOptions,
): RuleEvaluationResult {
  const start = Date.now();
  const activeRules = getActiveRules(rules ?? loadBuiltinRules());
  const violations: RuleViolation[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const [, node] of tree.nodes) {
    const context: RuleContext = { node, tree, scanOptions: options };
    for (const rule of activeRules) {
      if (!rule.enabled) {
        skipped++;
        continue;
      }
      const nodeViolations = evaluateRule(rule, context);
      if (nodeViolations.length === 0) {
        passed++;
      } else {
        failed++;
        violations.push(...nodeViolations);
      }
    }
  }

  return {
    violations,
    passed,
    failed,
    skipped,
    duration: Date.now() - start,
  };
}
