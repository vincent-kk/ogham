# r-statistics — 아키텍처

## 정체성 (설계의 닻)

**Claude를 도메인 중립 "통계 전문가"로 만드는 plugin.** 유일한 도메인은 통계 방법론 그 자체. 응용 도메인(의료·물리·화학·공학·사회과학…)에 앵커링하지 않는다. 어휘·게이트·룰셋·리소스는 순수 통계 기준으로만 작성한다.

## 3-Layer (filid 3-Layer plugin 동형)

판단 프레임워크: MCP=결정적 실행, Skill=실행계약 골격, Agent=비결정 추론, Dispatcher=결정적 오케스트레이션.

```
[Dispatcher] analyze 스킬 — 상태머신 오케스트레이션 (intent 분류 + 전이 + 모드별 checkpoint)
     ↓ (Task)
[Agent]      statistician / r-expert / methodology-validator  (추천만; 전이는 Dispatcher)
     ↓ (참조)
[Skill]      analyze · data-preparation · assumption-check · visualization · reporting · r-setup
                └ lazy: methods/{technique}/, shared/contract.R
     ↓ (mcp_*)
[MCP]        run_r · get_r_job · cancel_r_job · assert_analysis_plan  (도메인 무지·stateless)
     ↓ (spawn)
[R-CLI]      Rscript (temp 격리 + 명령어 게이트 + --vanilla + renv)
```

**의존성 단방향**: Dispatcher → Agent → Skill → MCP → R-CLI. 역방향 호출 금지.
**핵심 원리**: 비결정 LLM(Agent)을 결정적 상태머신(Dispatcher)+결정적 실행(MCP)이 감싼다.

## Dispatcher 구현 결정

Claude Code plugin에서 결정적 코드 실행 자리는 MCP 서버뿐이다(hook 미사용). 따라서 Dispatcher 상태머신은:

- **상태/전이 규칙** = `skills/analyze/references/state-machine.md` (문서로 명시, LLM이 따름 — filid cross-review chairperson 패턴)
- **결정적 강제 게이트** = `assert_analysis_plan` MCP 도구 (통계적 hard gate를 코드로 차단)
- **상태 영속** = MCP `workspace`에 분석 세션 상태 저장 (핸들러는 stateless, 상태는 외부 저장)

→ "비결정 위험"은 상태 규칙을 명시적 전이표 + iteration guard로 박아 억제. 상세 [dispatcher.md](./dispatcher.md).

## 디렉토리 구조 (deilen 차용)

```
plugins/r-statistics/
├── .claude-plugin/plugin.json          # 매니페스트 (name, version, skills, mcpServers)
├── .mcp.json                            # MCP 서버 등록 → bridge/mcp-server.cjs
├── bridge/mcp-server.cjs                # 빌드 산출물 (번들 MCP 서버)
├── skills/                              # 노출 6 (마크다운 only)
│   ├── analyze/                         # 메인 오케스트레이터 (= Dispatcher)
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── state-machine.md         # 상태·전이표·iteration guard
│   │       ├── intent.md                # intent 분류 휴리스틱
│   │       ├── modes.md                 # interactive / --auto
│   │       └── methods/{technique}/     # 기법별 lazy
│   │           ├── meta.yaml            # 가정·필수 아티팩트 선언 (assert 연동)
│   │           └── template.R.tmpl      # 코드 골격
│   ├── data-preparation/SKILL.md
│   ├── assumption-check/SKILL.md
│   ├── visualization/SKILL.md
│   ├── reporting/SKILL.md
│   └── r-setup/
│       ├── SKILL.md
│       └── references/{windows.md, macos.md, linux.md}
├── agents/
│   ├── statistician.md                  # frontmatter: name, model, tools, maxTurns
│   ├── r-expert.md
│   └── methodology-validator.md
├── shared/contract.R                    # 공통 R 실행계약 골격 (header/footer)
├── src/                                 # MCP 서버 (TypeScript, FCA)
│   ├── constants/
│   │   ├── paths.ts                     # 경로 상수 + 헬퍼 함수
│   │   ├── defaults.ts                  # DEFAULT_*, 한계값 (timeout, max iteration…)
│   │   └── messages.ts                  # 모든 사용자/에러 문자열 리터럴
│   ├── types/
│   │   └── enums.ts                     # as const 상수 (JobStatus, Severity, ExecutionMode, AssumptionId…)
│   ├── core/                            # FCA 프랙탈
│   │   ├── rRuntime/                    # Rscript 탐색·spawn·인코딩
│   │   │   ├── index.ts                 # 배럴
│   │   │   ├── INTENT.md                # 프랙탈 경계 (Korean)
│   │   │   └── operations/{discoverRscript,spawnRscript,decodeOutput}.ts  # 1함수 1파일
│   │   ├── workspace/                   # temp 격리·아티팩트 수집·세션 상태
│   │   │   ├── index.ts
│   │   │   └── operations/{createWorkspace,collectArtifacts,readManifest,pruneExpired}.ts
│   │   ├── commandGate/                 # POSIX/MS-DOS 명령어 + R 스크립트 게이트
│   │   │   ├── index.ts
│   │   │   └── operations/{validateCommand,resolveInstaller,validateRScript}.ts
│   │   └── jobStore/                     # 비동기 R 잡 인메모리 레지스트리
│   │       ├── index.ts
│   │       └── operations/{createJob,getJob,updateJob,cancelJob,cancelAllJobs}.ts
│   ├── mcp/                             # FCA 프랙탈
│   │   ├── server/lifecycle/{createServer,startServer}.ts
│   │   ├── tools/
│   │   │   ├── runR/{index.ts, runR.ts, operations/*.ts}
│   │   │   ├── getRJob/{index.ts, getRJob.ts}
│   │   │   ├── cancelRJob/{index.ts, cancelRJob.ts}
│   │   │   └── assertAnalysisPlan/{index.ts, assertAnalysisPlan.ts, operations/*.ts}
│   │   └── shared/helpers/{wrapHandler,toolResult,toolError}.ts
│   ├── lib/                             # 부속품(Organ) 격리: atomicWrite, logger…
│   ├── utils/                           # isoNow, randomId, isFileNotFound…
│   └── index.ts                         # 배럴
├── package.json, tsconfig.json, tsconfig.build.json
├── README.md, INTENT.md, CLAUDE.md
└── scripts/buildMcpServer.mjs
```

## 코드 규약

### FCA (Fractal Context Architecture)

- **프랙탈 분리**: `src/core/{rRuntime,workspace,commandGate}`·`src/mcp/{server,tools,shared}` 각각 자기유사 독립 단위(Bounded Context). 각 프랙탈에 `index.ts` 배럴 + `INTENT.md`(Purpose/Structure/Conventions/Boundaries/Dependencies, Korean).
- **부속품 격리**: 공유 유틸은 `lib/`·`utils/` 리프에 격리, INTENT.md 미부여.
- **상향식 지연 로딩**: 리프→루트 최소 컨텍스트.

### 1함수 1파일

- `operations/*.ts` 는 단일 export 함수. 예: `core/rRuntime/operations/discoverRscript.ts` → `discoverRscript()`.
- 도구 핸들러는 `tools/{tool}/{tool}.ts` 메인 + `operations/` 헬퍼.

### 문자열 리터럴 상수화

- **값 집합(enum류)**: `src/types/enums.ts` 에 `as const` 객체 (deilen `enums.ts` 패턴). 예: `JobStatus`, `Severity`(`hard`/`soft`), `ExecutionMode`(`interactive`/`auto`), `AssumptionId`.
- **사용자/에러 메시지**: `src/constants/messages.ts`.
- **경로**: `src/constants/paths.ts` (상수 + `workspaceDir(id)` 류 헬퍼).
- 인라인 문자열 리터럴 금지 — 전부 위 3곳에서 import.

### 기타

- **hook 미사용** (사용자 결정).
- 빌드: `scripts/buildMcpServer.mjs` → `bridge/mcp-server.cjs` (deilen 패턴).
- 테스트: vitest (`__tests__/`).
- **subprocess 호출**: 모든 CLI/spawn 은 `@ogham/cross-platform`(`spawnCli`/`spawnCliSync`) 경유 — `child_process` 직접 사용 금지(Windows shim·tree-kill·EOL 일관). 취소는 `AbortSignal`.
- **assert 룰셋 권위**: `assert_analysis_plan` 의 결정적 룰셋은 `mcp/tools/assertAnalysisPlan/operations/ruleset.ts`(TS 정본, 런타임 의존성 0). `methods/{technique}/meta.yaml` 은 에이전트용 미러 — 둘을 동기 유지.
- **에이전트 등록**: `plugin.json` 에 `agents` 필드 없음 — `agents/` 자동 발견(filid 동일).
