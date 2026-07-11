# Implementation Plan — 구조설계 · 테스팅 하네스 · 단계 실행

> **상태: 보류 — 개발예정.** 도구 구현(Stage A–C + L2)은 완료·커밋됐으나 채택(마이그레이션·빌드 배선·CI 상설화)은 보류다(2026-07-12 — [migration-playbook-deferred.md](./migration-playbook-deferred.md)).

> 설계 문서군(README·host-capability-matrix·ir-schema·compiler-architecture·case-studies)의 **구현 착지본**. 개념은 그 문서들, 이 문서는 "어디에 어떤 파일로 무엇을 먼저 짓는가".

## Status

- 구현체: [`tools/plugin-compiler`](../../tools/plugin-compiler/) (`@ogham/plugin-compiler`, tsx 실행). CLI: `extract`·`compile`·`verify`.
- Stage A–C + L2 착지: 하네스·Claude 등가 게이트·codex/agy 프로파일·agent/hook emitter·extraction(마이그레이션) 구현, **27 테스트 GREEN + 타입체크 클린**.
- **3-호스트 검증(복잡도 3계층)**:
  - deilen(L1): Claude 바이트 등가 · Codex 실 스모크(`mcp__deilen.*` 기동) · agy validate. → §D.1.
  - maencof-lens(최소 L2: hook+agent) · **filid(전체 L2: 19 skills·14 agents·5 hooks)**: 전부 Claude 등가 통과, Codex 훅 드롭+agent TOML, agy 훅 event 매핑. → §D.2.
- 잔여: Stage D(빌드 통합 `compile:plugin`·CI clean-regen/windows·루트 마켓플레이스 emit·codex 에이전트 설치 스텝), agy 인터랙티브 MCP 스모크, 나머지 플러그인(maencof·imbas·cennad…) 정본화.

## 1. 패키지 위치 결정

컴파일러는 플러그인도, 런타임 공유 lib도, mcp-server도 아닌 **빌드 타임 도구**다. 기존 워크스페이스(`plugins/*`·`shared/*`·`mcp-servers/*`) 어디에도 의미상 맞지 않는다.

**결정: `tools/plugin-compiler` 신설** (`@ogham/plugin-compiler`, `private: true`).

- 루트 `package.json` workspaces 에 `"tools/*"` glob 추가.
- `tsx` 로 실행(내부 도구 — dist 빌드 산출물 불요, `scripts/*.mjs` 와 동급). 프로그램 API + CLI 양쪽 제공.
- 정본/산출물은 **플러그인 안**에 둔다(컴파일러 안이 아니라): `plugins/<pkg>/definitions/`(정본) → `plugins/<pkg>/targets/<host>/`(산출물). 컴파일러는 순수 함수.

## 2. 정본 / 산출물 경계 (요구 1·3 의 물리 구현)

```
plugins/<pkg>/
├── definitions/              ← 정본 SSoT (사람이 편집, 커밋)
│   ├── plugin.yaml
│   ├── skills/<name>.md       (또는 <name>/SKILL.md + 지원파일)
│   ├── agents/<name>.yaml
│   └── hooks/<name>.yaml
├── src/ · bridge/ · libs/    ← 런타임 (호스트 중립, 무수정, 커밋)
└── targets/<host>/           ← 산출물 (컴파일러 생성, 커밋; linguist-generated)
    ├── claude/  codex/  agy/
```

- 루트 마켓플레이스 매니페스트가 `targets/<host>` 를 가리킴.
- 산출물 손편집 금지 — CI 가 "재생성 시 무변경(clean-regen)" 으로 강제.

## 3. 모듈 트리 (FCA-AI 준수)

`tsx` 실행 도구이나 FCA(fractal 루트=barrel+INTENT/DETAIL, organ=1함수/파일, concrete import)를 지킨다.

```
tools/plugin-compiler/
├── INTENT.md · DETAIL.md · package.json · tsconfig(.build).json · vitest.config.ts
└── src/
    ├── main.ts                       # CLI 진입 (executable): argv → runPipeline
    ├── types/                        # organ (타입 전용, INTENT 없음)
    │   ├── ir.ts                     #   PluginIR · McpIR · SkillIR · AgentIR · HookIR · ExtraFile
    │   └── profile.ts                #   HostProfile · HostId · LogicalEvent
    ├── ir/                           # fractal: definitions/ → PluginIR
    │   ├── INTENT.md · index.ts
    │   ├── loadDefinitions/          #   디렉터리 walk → PluginIR
    │   ├── parsePluginYaml/          #   plugin.yaml → 부분 IR
    │   ├── parseSkill/               #   SKILL.md (raw text + frontmatter keys)
    │   └── validateIr/               #   스키마 불변식 (ir-schema §5)
    ├── tokens/                       # organ (pure-function): 토큰 규약
    │   ├── substituteTokens.ts       #   {{tool:}}/{{skill:}}/{{pluginRoot}} → 프로파일 값
    │   └── lintLiteralTools.ts       #   본문 리터럴 mcp__ 금지 검사
    ├── profiles/                     # fractal: 호스트 규칙
    │   ├── INTENT.md · index.ts
    │   ├── claude.ts · codex.ts · agy.ts
    │   └── shared/                   #   organ: modelSlug 매핑, matcher 번역표
    ├── emit/                         # fractal: PluginIR + Profile → 파일 맵
    │   ├── INTENT.md · index.ts
    │   ├── emitPlugin/               #   한 호스트 전체 오케스트레이션 → FileMap
    │   ├── emitManifest/ · emitMcp/ · emitSkill/ · emitAgent/ · emitHook/ · emitRuntime/ · emitMarketplace/
    │   └── shared/                   #   organ: stableJson (JSON.stringify+키순서+개행), FileMap 타입
    ├── pipeline/                     # fractal: 단계 실행 + 디스크 쓰기
    │   ├── INTENT.md · index.ts
    │   ├── compilePlugin/            #   parse→validate→(호스트별 bind→emit)→FileMap
    │   └── writeTargets/             #   FileMap → targets/<host>/ (원자적)
    └── verify/                       # fractal: 신뢰도 게이트 ★선행 구축
        ├── INTENT.md · index.ts
        ├── diffTree/                 #   두 디렉터리 재귀 바이트 비교 → Diff[]
        └── claudeEquivalence/        #   targets/claude vs 현행 커밋 산출물
```

## 4. 구체 IR 타입 (계약 — 정본은 [`src/types/ir.ts`](../../tools/plugin-compiler/src/types/ir.ts))

구현 착지형(초기 스케치에서 진화한 최종형):

```ts
interface PluginIR {
  name: string;
  version: string;
  description: string;
  keywords?: string[];
  author?: { name: string; email?: string };
  license?: string;
  repository?: string;
  homepage?: string;
  store?: Record<string, unknown>; // Codex interface 등 스토어 메타
  mcp?: McpIR;
  skills: SkillIR[];
  agents: AgentIR[];
  hooks: HookIR[];
  hooksRaw?: string; // 토큰화 hooks.json 원문 (Claude 구조보존 emit)
  runtimeFiles: ExtraFile[]; // bridge/·libs/·README verbatim
}
interface McpIR {
  server: string;
  entry: string;
  transport?: "stdio";
}
interface SkillIR {
  // 포맷 보존
  name: string;
  rawText: string; // 원본 SKILL.md 전체 (본문에 {{token}})
  frontmatterKeys: Record<string, unknown>;
  supportingFiles: ExtraFile[]; // references/*.md 등 verbatim/토큰치환
}
interface AgentIR {
  name: string;
  rawText: string;
} // frontmatter 미파싱 — Codex 가 관용 추출
interface HookIR {
  event: LogicalEvent;
  matcher: string;
  command: string; // 토큰화({{pluginRoot}}) 커맨드
  timeout?: number;
  fallback?: "pre-invocation-once" | "stale-sweep" | "stop" | "drop";
}
interface ExtraFile {
  relPath: string;
  bytes: Buffer;
}
```

- **manifestKeyOrder 제거**: JSON 은 의미 비교라 키 순서 무관 → 불요.
- **AgentIR 단순화**: 정규화(capability/model/bundle) 대신 rawText 보존 — Claude/agy 바이트 충실 + Codex 는 frontmatter 를 관용 추출(토큰화된 `tools:` 는 유효 YAML 아님).
- **HookIR.command**(entry 아님) + `hooksRaw`: Claude 는 원문 구조 보존 치환, agy 는 HookIR 로 재배선.

`HostProfile`([`src/types/profile.ts`](../../tools/plugin-compiler/src/types/profile.ts))는 buildManifest/buildMcp/toolRef/skillRef + agents/hooks 전략(데이터). emit 결과는 `FileMap = Map<relPath, Buffer>` — 디스크 쓰기와 검증을 분리(순수성).

## 5. 테스팅 하네스 = 신뢰도 앵커 (★ 코드보다 먼저)

**핵심 통찰: 현행 커밋된 플러그인이 golden oracle.** 별도 골든 파일을 만들지 않는다.

### 5.1 바이트 등가성 게이트 (요구 1 의 기계적 보장)

```
claudeEquivalence(pkg):
  emitted = compilePlugin(pkg).targets.claude          # FileMap
  current = read(plugins/<pkg>/{.claude-plugin,.mcp.json,skills})
  return diffTree(emitted, current)                    # 반드시 [] (빈 배열)
```

- deilen 을 첫 fixture 로: `definitions/` 를 현행 산출물에서 추출(도구명 → 토큰) → 컴파일 → **바이트 동일**이면 컴파일러가 Claude 에 무해함이 증명됨.
- 달성 근거(실측): JSON 은 `JSON.stringify(obj, null, 2) + "\n"` + 원본 키순서, SKILL.md 는 passthrough(토큰만 가역 치환), 지원파일은 verbatim 복사. deilen 산출물 확인: 2-space indent, 파일 끝 `}\n`/`\n`.

### 5.2 테스트 계층

| 계층                | 대상                       | 방법                                                        | 통과 기준      |
| ------------------- | -------------------------- | ----------------------------------------------------------- | -------------- |
| **등가성 게이트**   | Claude                     | `diffTree(emit, 현행)` = []                                 | 바이트 동일    |
| **스냅샷**          | codex·agy                  | vitest `toMatchFileSnapshot` (targets 골든)                 | 스냅샷 일치    |
| **단위**            | tokens·stableJson·diffTree | 순수함수 입출력                                             | 3+12 규칙 내   |
| **구조 린트**       | 전 호스트                  | 미해결 토큰 0, 리터럴 mcp\_\_ 0, Codex 타깃 hooks 파일 부재 | 위반 0         |
| **스모크(수동/CI)** | codex·agy                  | 로컬 CLI 설치→도구 로드 (PoC 스크립트 재사용)               | 도구 노출/기동 |

### 5.3 구축 순서 (하네스 선행)

1. `diffTree` + `stableJson` **단위 테스트부터**(순수함수, 오라클 없이 검증 가능).
2. `claudeEquivalence` 하네스 + deilen 대상 **FAILING 테스트**(컴파일러 전무 → 실패 확인).
3. 그 다음 컴파일러를 채워 **GREEN 전환** → 신뢰도 확보 완료 시점.

## 6. 실행 단계 (로드맵 Stage 1 착지)

| 단계                        | 산출                                                                                                                      | 게이트                        | 상태                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------- |
| **A. 구조+하네스**          | 패키지 스캐폴드 · IR/Profile 타입 · `diffMaps`/`stableJson`/`jsonEqual`+단위테스트                                        | 단위 GREEN                    | ✅                              |
| **B. Claude 최소 컴파일러** | ir 로더 · tokens · claude 프로파일 · manifest/mcp/skill/assets emitter · deilen `definitions/`                            | **등가 게이트 GREEN**         | ✅                              |
| **C. Codex+agy**            | codex/agy 프로파일·emitter(cwd·서버명 오버라이드·훅 미생성·mcp_config) · 구조 테스트 · codex 실 스모크                    | 구조 GREEN, codex 스모크 그린 | ✅ (agy 인터랙티브 스모크 잔여) |
| **D. 빌드 통합**            | 플러그인 `compile:plugin` 스크립트 · 루트 마켓플레이스 emit · CI(clean-regen·windows-latest) · agents/hooks 플러그인 확장 | 전 게이트 CI                  | ⏳                              |

A·B 를 deilen 유일 fixture 로 완주해 **신뢰도(바이트 등가)를 먼저 못 박고**, 그 위에서 C(타 호스트)를 확장했다. 등가 게이트는 JSON 은 의미(`jsonEqual`), 그 외는 바이트(스킬 라운드트립·assets)로 비교 — 포맷 취약성을 우회하며 무결손을 정확히 보장.

## 7. 리스크 가드 (구현 중 지킬 불변식)

- 산출물 emit 은 순수 `FileMap` 반환 → 디스크 쓰기(`writeTargets`)와 분리(테스트 용이·원자성).
- `stableJson` 은 키 순서를 IR `manifestKeyOrder` 로 고정 — 재직렬화 표류 차단.
- SKILL.md 는 절대 parse-reserialize 하지 않음 — raw text 위 토큰 치환/라인 필터만.
- Codex 타깃에 hooks 산출물 생성 시 빌드 실패(선언=세션 행, 실측).
- 훅 진입은 `node <script>` 직접 호출 유지(쉘 스크립트 금지) — Windows 축 보존.
