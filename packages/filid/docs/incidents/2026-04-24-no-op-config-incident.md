# [개발 의뢰서] filid 스키마 검증 및 waiver 메커니즘 개선

- **의뢰자**: Vincent K. Kelvin (lunox298@gmail.com)
- **의뢰일**: 2026-04-24
- **대상 패키지**: `@ogham/filid` (현재 캐시 버전 0.3.7)
- **발견 경위**: 외부 프로젝트 `albatrion` 의 PR #316 리뷰 파이프라인 (`/filid:filid-pipeline`) 전체 사이클 실행 중, `filid-resolve --auto` 가 **no-op config 커밋**을 PASS 판정으로 통과시킨 사건.
- **본 의뢰서 목적**: 재발 방지를 위한 플러그인/스킬/문서 수준 근본 원인 해결 요청.

---

## 0. Executive Summary

단일 사건에서 **6개 독립 결함**이 연쇄 작용하여, 의미상 완전히 비어있는 config 가 "리뷰 완료 → 수정 적용 → 재검증 PASS" 파이프라인을 정상 통과했다. 가장 치명적인 것은 **(P1) `FilidConfig` 의 unknown-key silent-drop** 이다 — 이것 하나만 막아도 나머지 연쇄는 차단된다.

요약:

| # | Severity | 범주 | 위치 | 한 줄 요약 |
| --- | --- | --- | --- | --- |
| P1 | **Critical** | Plugin | `src/core/infra/config-loader/loaders/filid-config.ts` | unknown key 가 경고 없이 버려짐 → no-op config 생성 |
| P2 | **High** | Plugin | `src/core/rules/rule-engine/rule-engine.ts` (module-entry-point) | 해제 메커니즘 부재 — npm 패키지 루트 해결 불가 |
| P3 | **Medium** | Plugin | `src/core/rules/rule-engine/rule-engine.ts` (zero-peer-file) | `additional-allowed` 가 전역 basename 만 지원 |
| P4 | **High** | Skill | `skills/filid-revalidate/SKILL.md` | "파일 변경 ≠ 룰 해결" 대조 강제 부재 |
| P5 | **High** | Skill + Agents | `skills/filid-review/phases/phase-d-deliberation.md` + `agents/*.md` | 위원회가 제안한 config 패치가 스키마 검증 없이 committee → fix-requests → resolve 까지 통과 |
| P6 | **Medium** | Docs | `.claude/rules/filid_fca-policy.md`, skill INTENT.md 들 | waiver 키의 top-level vs nested 배치가 문서에 없음 |

---

## 1. 사건 요약 (Incident Timeline)

1. `albatrion/PR#316` 에 대해 `/filid:filid-pipeline` 실행 (6-persona team 심의, HIGH complexity).
2. Phase A-D 결과 `verdict: REQUEST_CHANGES`, `fix-requests.md` 에 **FIX-001~FIX-012** 생성.
3. 이 중 FIX-001~FIX-004 의 "Code Patch" 가 다음 형태로 작성됨:
   ```json
   // FIX-001
   { "rules": { "module-entry-point": { "allowed-no-entry": ["..."] } } }
   // FIX-002/003/004
   { "rules": { "zero-peer-file": { "additional-allowed": [...] } } }
   ```
4. `filid:filid-resolve --auto` 가 12건 전량 적용, typecheck 통과, 커밋 + 푸시 (커밋 `eb053e40`).
5. `filid:filid-revalidate` 가 PASS 판정을 내리고 PR 코멘트 게시, 세션 디렉터리 정리.
6. **사후 독립 검증**: `mcp_t_structure_validate` 재실행 시 16 개 경고가 여전히 동일하게 발생. 원인 조사 결과:
   - `allowed-no-entry` 키는 filid 코드 어디에도 존재하지 않음 (환각).
   - `rules["<id>"].additional-allowed` 는 `RuleOverride` 스키마 미지원으로 silent-drop.
   - 결과: FIX-001~FIX-004 는 **모두 런타임 효력 0** 의 no-op config.
7. 그럼에도 파이프라인이 PASS 를 출력한 것은 **P4 (revalidate 검증 약함)** + **P1 (silent-drop)** 의 상호작용.

---

## 2. P1 — `FilidConfig` 스키마 silent-drop (**Critical**)

### 2.1 현상

```ts
// src/core/infra/config-loader/loaders/filid-config.ts:54
const parsed = JSON.parse(raw) as FilidConfig;
```

단순 `as` 캐스트로 파싱 완료 처리. `FilidConfig` 타입:

```ts
// 같은 파일 19-34
export interface FilidConfig {
  version: string;
  rules: Record<string, RuleOverride>;
  language?: string;
  'additional-allowed'?: string[];
  scan?: { maxDepth?: number };
}
```

그리고 `RuleOverride` (`src/types/rules.ts:67-71`):

```ts
export interface RuleOverride {
  enabled?: boolean;
  severity?: RuleSeverity;
}
```

사용자가 `rules["zero-peer-file"]` 하위에 `additional-allowed` 배열을 넣거나, `rules["module-entry-point"]` 하위에 `allowed-no-entry` 배열을 넣어도 — 이 키들은 JSON 파서가 객체에 보존하지만 **`loadBuiltinRules(overrides)` → `applyOverrides` 경로는 오직 `enabled`/`severity` 만 소비**하므로 나머지는 조용히 버려진다.

### 2.2 재현 최소 예시

```json
{
  "version": "1.0",
  "rules": {
    "zero-peer-file": {
      "enabled": true,
      "severity": "warning",
      "additional-allowed": ["CLAUDE.md", "LICENSE"]
    }
  }
}
```

기대: `CLAUDE.md`, `LICENSE` 가 peer-file 경고에서 제외됨.
실제: 경고 그대로 발생. `additional-allowed` 는 로더 단계에서 소실.

### 2.3 영향

- **사용자 착각**: 설정이 JSON 으로 유효하고 "추가했는데 왜 안 되는지" 디버깅 어려움.
- **감사 위험**: CI / 자동 파이프라인이 "config 가 업데이트됨 → 룰 해제됨" 이라는 가정하에 통과시키기 쉬움 (P4 와 결합 시 이번 사건).
- **문서 역류**: 정책 문서는 규칙별로 "add to `.filid/config.json` `additional-allowed`" 라고 쓰는데, 이 문구를 본 사용자는 규칙 블록 안에 넣기 쉽다 (실제로 저희 6-persona 위원회가 모두 이렇게 썼음).

### 2.4 제안 수정

**A안 (최소 침습, 우선 권장)**: `loadConfig` 에서 알려진 키 allowlist 기반 경고.

```ts
const KNOWN_TOP_KEYS = new Set(['version', 'rules', 'language', 'additional-allowed', 'scan']);
const KNOWN_RULE_OVERRIDE_KEYS = new Set(['enabled', 'severity']);

export function loadConfig(projectRoot: string): FilidConfig | null {
  // ... 기존 코드 ...
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  // 경고: unknown top-level keys
  for (const key of Object.keys(parsed)) {
    if (!KNOWN_TOP_KEYS.has(key)) {
      log.warn(`unknown top-level key in ${configPath}: "${key}" (ignored)`);
    }
  }

  // 경고: unknown rule-override keys
  const rules = (parsed as FilidConfig).rules ?? {};
  for (const [ruleId, override] of Object.entries(rules)) {
    for (const key of Object.keys(override)) {
      if (!KNOWN_RULE_OVERRIDE_KEYS.has(key)) {
        log.warn(
          `unknown key in rules[${ruleId}]: "${key}" (ignored; did you mean top-level "additional-allowed"?)`
        );
      }
    }
  }

  return parsed as FilidConfig;
}
```

**B안 (정식, 이상적)**: `zod` 로 전체 스키마 parse.

```ts
import { z } from 'zod';

const RuleOverrideSchema = z.object({
  enabled: z.boolean().optional(),
  severity: z.enum(['error', 'warning', 'info']).optional(),
}).strict();

const FilidConfigSchema = z.object({
  version: z.string(),
  rules: z.record(z.string(), RuleOverrideSchema),
  language: z.string().optional(),
  'additional-allowed': z.array(z.string()).optional(),
  scan: z.object({ maxDepth: z.number().nonnegative().finite().optional() }).optional(),
}).strict();

// parse 시 unknown key → ZodError; log 후 무시 OR 실패.
```

**C안 (개발자 선호, 하이브리드)**: zod parse → 실패 시 A안의 warn 로직으로 fall-back.

### 2.5 회귀 테스트 요구사항

```ts
describe('loadConfig', () => {
  it('warns on unknown top-level key', () => {
    writeConfig(root, { version: '1.0', rules: {}, 'bogus-key': true } as any);
    const spy = vi.spyOn(log, 'warn');
    loadConfig(root);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('bogus-key'));
  });

  it('warns on unknown rule-override key', () => {
    writeConfig(root, {
      version: '1.0',
      rules: { 'zero-peer-file': { enabled: true, 'additional-allowed': ['X'] } as any },
    });
    const spy = vi.spyOn(log, 'warn');
    loadConfig(root);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('additional-allowed'));
  });
});
```

---

## 3. P2 — `module-entry-point` 해제 메커니즘 부재 (**High**)

### 3.1 현상

```ts
// src/core/rules/rule-engine/rule-engine.ts:152-178
{
  id: BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
  // ...
  check(context: RuleContext): RuleViolation[] {
    const { node } = context;
    if (node.type !== 'fractal' && node.type !== 'hybrid') return [];
    if (!node.hasIndex && !node.hasMain) {
      return [{ /* violation */ }];
    }
    return [];
  },
}
```

- 규칙 바디가 `hasIndex || hasMain` 을 하드코딩.
- `loadBuiltinRules(overrides, additionalAllowed)` 의 어느 파라미터도 이 규칙의 check 에 전달되지 않음.
- 결과: config 로 특정 fractal 을 이 규칙에서 면제할 방법이 **코드 레벨에서 없음**.

### 3.2 영향

- npm 패키지 루트가 `packages/<name>/src/index.ts` 패턴 (표준 npm 레이아웃) 을 따를 때, 자동으로 `packages/<name>/` 이 fractal 로 분류되지만 루트에 `index.ts`/`main.ts` 를 둘 수 없음 (npm 관례와 충돌, bin/dist 와 공존 불가).
- 결과: 해당 패키지마다 영구 warning. "수정 가능 여부 자체가 없음" 을 사용자가 깨닫는 데 시간 소요.
- 이번 사건에서 위원회가 이를 해결하기 위해 존재하지 않는 `allowed-no-entry` 키를 환각함 — 규칙에 탈출구가 없다는 구조적 압력이 근본 원인.

### 3.3 제안 수정

**통합 waiver 메커니즘 도입** (`zero-peer-file` 의 `additional-allowed` 와 미래 다른 규칙들까지 일관되게 처리):

```ts
// src/types/rules.ts 확장
export interface RuleOverride {
  enabled?: boolean;
  severity?: RuleSeverity;
  /** Paths (glob or literal) exempt from this rule. */
  exempt?: string[];
}
```

```ts
// src/core/infra/config-loader/loaders/filid-config.ts 의 RuleOverride 로딩 시 exempt 전달
```

```ts
// rule-engine.ts 의 각 규칙 check 에서 exempt 검사
import { matchesAny } from '../../../lib/glob-match.js';

check(context) {
  const override = overrides[rule.id];
  if (override?.exempt && matchesAny(context.node.path, override.exempt)) {
    return [];
  }
  // 기존 로직
}
```

### 3.4 사용 예시

```json
{
  "rules": {
    "module-entry-point": {
      "enabled": true,
      "exempt": ["packages/**"]
    }
  }
}
```

### 3.5 대안 (더 작은 변경)

`module-entry-point` 전용 `allowed-no-entry: string[]` 필드 추가 (이번 사건에서 위원회가 환각한 키를 정식화). 다른 규칙에 대한 일관성을 희생하지만 변경 범위가 작음. **중장기로는 P2 의 통합 `exempt` 권장.**

---

## 4. P3 — `additional-allowed` 가 전역 basename 매칭 (**Medium**)

### 4.1 현상

```ts
// src/core/rules/rule-engine/rule-engine.ts:296-299
if (additionalAllowed)
  for (const f of additionalAllowed) allowed.add(f);

const disallowed = peerFiles.filter((f) => !allowed.has(f));
```

- `peerFiles` 는 basename 배열 (예: `["CLAUDE.md", "package.json"]`).
- 매칭은 `Set.has()` 완전일치 → glob 불가, 경로 scoping 불가.
- 사용자가 `"packages/<x>/src/prompts/*.ts"` 같은 경로형 엔트리를 넣으면 아무것도 매칭하지 않음 (조용히 무효).

### 4.2 영향

- **repo-wide vs path-specific 구분 불가**: `type.ts` 를 모든 fractal 에 허용할지, 특정 서브트리에만 허용할지 제어 불가.
- **문서와 오해**: 사용자는 glob 패턴도 작동할 것이라 자연스럽게 기대.

### 4.3 제안 수정

**객체 엔트리 지원** (하위호환 유지):

```ts
type AllowedEntry = string | { basename: string; paths?: string[] };

export interface FilidConfig {
  // ...
  'additional-allowed'?: AllowedEntry[];
}
```

규칙 체크 시:

```ts
const allowed = new Set(ALLOWED_FRACTAL_ROOT_FILES);
if (additionalAllowed) {
  for (const entry of additionalAllowed) {
    if (typeof entry === 'string') {
      allowed.add(entry);
    } else if (entry.paths && !matchesAny(node.path, entry.paths)) {
      continue; // 이 노드에는 적용 안 됨
    } else {
      allowed.add(entry.basename);
    }
  }
}
```

### 4.4 사용 예시

```json
{
  "additional-allowed": [
    "type.ts",
    { "basename": "confirmForce.ts", "paths": ["packages/*/src/prompts"] },
    { "basename": "eslint.config.js", "paths": ["packages/**"] }
  ]
}
```

---

## 5. P4 — `filid-revalidate` 가 config-based fix 검증 약함 (**High**, Skill)

### 5.1 현상

`skills/filid-revalidate/SKILL.md` Step 3:

> For each accepted fix item from `justifications.md`:
> 1. Check if the target file was modified in the Delta
> 2. Re-run the relevant MCP tool to confirm the rule is now satisfied
> 3. Mark each fix as RESOLVED or UNRESOLVED

설계는 올바르지만 **"Step 2 실패 시 Step 3 를 UNRESOLVED 로 강제" 라는 명시적 연결이 없음**. 실제 서브에이전트 실행 시:

- 타겟 파일이 바뀌었음을 확인 (Step 1 OK)
- `structure_validate` 재실행해서 16개 경고 여전히 발견
- **그러나** "파일 내용이 fix-requests 에 적힌 대로 바뀌었으므로 RESOLVED" 로 자체 판단
- 전체 verdict PASS

### 5.2 영향

- 이번 사건의 **직접 원인**. P1 이 no-op 을 만들어내고, P4 가 그것을 "해결됐다" 로 승인.
- 사용자 신뢰 붕괴 — "파이프라인이 PASS 라고 했는데 실제로는 아무것도 안 고쳐졌음" 경험.

### 5.3 제안 수정

SKILL.md Step 3 텍스트 강화:

```markdown
### Step 3 — Verify Accepted Fixes (strict mode)

For each accepted fix item from `justifications.md`:

1. Load the fix's `(target_path, rule_id)` tuple.
2. Run the corresponding MCP tool scoped to `target_path`:
   - structure violation → `mcp_t_structure_validate(path=<target_path>)` and filter violations by `ruleId == <rule_id>`.
   - LCOM4 / CC / 3+12 → per-violation MCP tool with post-fix artifact.
3. **Mandatory gate**: if the same `(target_path, rule_id)` violation is STILL present
   after the fix, mark the fix as UNRESOLVED regardless of file-diff evidence.
   File content matching the fix-requests patch is necessary but NOT sufficient.
4. Record per-fix result in a `verification-ledger.md` artifact with
   columns: fix_id, target_path, rule_id, pre_count, post_count, status.
```

서브에이전트 프롬프트 템플릿에도 동일한 gate 문구 embed.

### 5.4 추가 안전장치

`re-validate.md` 최종 verdict 직전에 "metadata consistency check": 만약 `verification-ledger` 에 UNRESOLVED 가 1개라도 있으면 verdict 를 자동으로 FAIL 로 pin. 서브에이전트가 판단으로 이를 뒤집을 수 없도록 구조적 제약.

---

## 6. P5 — `filid-review` fix-requests 코드 패치 스키마 검증 부재 (**High**, Skill + Agents)

### 6.1 현상

Phase D (chairperson) 가 `fix-requests.md` 를 작성할 때, 각 fix 의 "Code Patch" 영역은 **자유 형식 markdown code block**. 이번 사건에서:

- engineering-architect, knowledge-manager, business-driver 세 페르소나가 각자의 `round-1-<id>.md` 에서 `allowed-no-entry` 를 환각.
- chairperson (main) 이 이 제안을 통합해 `FIX-001` Code Patch 에 JSON 조각으로 그대로 기술.
- 검증 없음.

### 6.2 영향

- P1 과 결합 시 "잘못된 config 키를 제안 → 조용히 drop → no-op 커밋" 경로가 누구에게도 보이지 않음.
- 위원회가 다수결로 환각을 강화할 수 있음 (이번 경우 3/6 이 동일 환각).

### 6.3 제안 수정

**Phase D Step D.6.4 (`fix-requests.md` 작성) 에 validation gate 추가**:

```markdown
### D.6.4 — Write fix-requests.md

For each fix item whose Code Patch modifies a `.filid/config.json`:

1. Parse the JSON patch.
2. Validate against the `FilidConfig` / `RuleOverride` zod schema (imported
   from `@ogham/filid`).
3. If validation fails: either
   a. Rewrite the patch to conform (e.g., relocate keys to correct level), OR
   b. Mark the fix with `Type: blocked` and quote the zod error as the
      rationale in the fix description.
4. Never emit an unvalidated `.filid/config.json` patch to fix-requests.md.
```

### 6.4 페르소나 에이전트 프롬프트 강화

`agents/engineering-architect.md`, `agents/knowledge-manager.md`, 기타 구조 관련 페르소나에 다음 항목 추가:

```markdown
## Config Proposal Discipline

When suggesting `.filid/config.json` changes:

- MUST verify each proposed key against the live `FilidConfig` /
  `RuleOverride` types in `@ogham/filid` src before including in `fix_items`.
- MUST quote the exact schema line from `src/types/rules.ts` or
  `src/core/infra/config-loader/loaders/filid-config.ts` as evidence.
- MUST flag "no waiver mechanism exists" explicitly when a rule has no
  config-level escape hatch, rather than inventing one.
```

---

## 7. P6 — 문서 (Medium, Docs)

### 7.1 현상

`.claude/rules/filid_fca-policy.md` (프로젝트 배포용 정책 문서) 에 예시:

> Fix: promote peer file to a subdirectory, or add to `.filid/config.json` `additional-allowed`.

→ top-level 인지 rules-nested 인지 명시 없음.

`skills/*/INTENT.md` 의 config 예시도:

> Configure in `.filid/config.json`: `{ "rules": { "<rule-id>": { "enabled": true|false } } }`

→ 이것이 완전한 스키마라는 인상을 줌. 사용자가 waiver 도 같은 패턴으로 넣기 쉬움.

### 7.2 제안 수정

`.claude/rules/filid_fca-policy.md` 에 **완전한 config 예시 섹션** 추가:

```markdown
## Full `.filid/config.json` Schema Example

```json
{
  "version": "1.0",
  "language": "en",
  "rules": {
    "naming-convention":      { "enabled": true,  "severity": "warning" },
    "zero-peer-file":         { "enabled": true,  "severity": "warning" },
    "module-entry-point":     { "enabled": true,  "severity": "warning",
                                "exempt": ["packages/**"] }
  },
  "additional-allowed": [
    "type.ts",
    { "basename": "CLAUDE.md", "paths": ["packages/**"] }
  ],
  "scan": { "maxDepth": 10 }
}
```

Note: `additional-allowed` is a **top-level key**, NOT nested under
individual rules. `exempt` is per-rule and accepts path globs.
```

---

## 8. 우선순위 매트릭스

| 우선순위 | 작업 | 예상 LOC | 예상 공수 | 차단 효과 |
| --- | --- | --- | --- | --- |
| **P1** | zod 또는 수동 allowlist 검증 추가 | ~60 | 2h | 이번 사건 유형 전면 차단 |
| **P4** | revalidate SKILL.md gate 문구 + ledger | ~40 (md) | 1h | config-based fix 의 false-positive 차단 |
| **P5** | phase-d-deliberation.md 에 zod 검증 게이트 + 페르소나 프롬프트 | ~80 (md) | 2h | 환각 config 패치가 upstream 에 진입 차단 |
| **P2** | 통합 `exempt` 필드 추가 | ~120 | 4h | 근본적 유연성 확보 |
| **P3** | 객체형 `additional-allowed` + glob 지원 | ~100 | 4h | path-scoped waiver |
| **P6** | 문서 예시 추가 | ~50 (md) | 1h | 사용자 교육 |

### 제안 릴리스 전략

- **v0.3.x 패치 릴리스 (urgent)**: P1 + P4 + P5 + P6 (문서만)
  - zod 의존성 추가 (peer)
  - 기존 config 완전 하위호환
  - 즉시 배포해도 안전
- **v0.4.0 마이너 릴리스**: P2 + P3
  - `RuleOverride.exempt` 추가 (하위호환)
  - `additional-allowed` 객체 엔트리 지원 (하위호환)

---

## 9. 재현 시나리오 (P1 기준 minimal repro)

```bash
# Setup
mkdir /tmp/filid-repro && cd /tmp/filid-repro
git init
mkdir .filid
cat > .filid/config.json <<'JSON'
{
  "version": "1.0",
  "rules": {
    "zero-peer-file": {
      "enabled": true,
      "severity": "warning",
      "additional-allowed": ["CLAUDE.md"]
    }
  }
}
JSON

# Create a fractal with a CLAUDE.md peer file
mkdir my-module
cat > my-module/INTENT.md <<'MD'
## Purpose
test
MD
cat > my-module/index.ts <<'TS'
export const x = 1;
TS
touch my-module/CLAUDE.md

# Validate via MCP tool
# 예상 동작: CLAUDE.md 가 additional-allowed 에 있으므로 0 violation
# 실제: 1 violation (rule-engine 은 nested additional-allowed 를 못 읽음)
mcp_t_structure_validate path=.
```

---

## 10. 회귀 테스트 체크리스트

### Plugin (P1-P3)

- [ ] `loadConfig` unknown top-level key → `log.warn` 발생
- [ ] `loadConfig` unknown rule-override key → `log.warn` 발생, key 이름 포함
- [ ] zod (B안 채택 시): 잘못된 severity 값 → `log.error` + `null` 반환
- [ ] `rules[<id>].exempt` 경로 glob 매칭 시 해당 노드에서 규칙 skip
- [ ] `additional-allowed` 객체 엔트리의 `paths` 조건부 적용
- [ ] `additional-allowed` 문자열 엔트리 하위호환 동작

### Skills (P4-P5)

- [ ] revalidate: `(target_path, rule_id)` 가 post-fix 에 여전히 존재 → UNRESOLVED 강제
- [ ] revalidate: `verification-ledger.md` 에 UNRESOLVED 1건 이상 → verdict FAIL pin
- [ ] review: `.filid/config.json` 패치가 zod 실패 → fix-requests.md 에 `Type: blocked` 로 기록
- [ ] 페르소나 에이전트 프롬프트: schema 인용 없이 config 제안 시 재요청

### Docs (P6)

- [ ] `.claude/rules/filid_fca-policy.md` 에 full config 예시 존재
- [ ] skill INTENT.md 들에 "top-level 인지 nested 인지" 명시

---

## 11. 첨부 — 실제 사건 증거

- **origin 커밋**: `albatrion` `eb053e40 fix(filid): resolve FIX-001 through FIX-012 from review`
- **잘못된 config 예시**:
  ```json
  {
    "rules": {
      "module-entry-point": {
        "enabled": true,
        "allowed-no-entry": ["packages/slats/claude-assets-sync"]
      },
      "zero-peer-file": {
        "enabled": true,
        "additional-allowed": [ "type.ts", "CLAUDE.md", "LICENSE", ... ]
      }
    }
  }
  ```
- **PR 링크**: https://github.com/vincent-kk/albatrion/pull/316
- **리뷰 코멘트**: https://github.com/vincent-kk/albatrion/pull/316#issuecomment-4309753223
- **잘못된 PASS 코멘트**: https://github.com/vincent-kk/albatrion/pull/316#issuecomment-4309787023
- **사후 정정 fix-up 커밋**: (본 의뢰서 작성 후 추가, 같은 브랜치)

---

## 12. 의뢰자 요청

1. **즉시 (이번 주)**: P1 + P4 + P5 + P6 을 다룬 v0.3.x 패치 릴리스.
2. **다음 minor**: P2 + P3 를 v0.4.0 에 포함.
3. 완료 후 본 의뢰서는 `docs/incidents/2026-04-24-no-op-config-incident.md` 로 아카이브하여 재발 방지 학습 자료로 활용.

문의 또는 구현 중 검토 필요 시 `vincent-kk/albatrion` Issues 또는 위 이메일로 연락 부탁드립니다.
