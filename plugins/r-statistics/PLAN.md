# r-statistics — 통합 개발 계획 (PLAN.md)

> **목표**: `.metadata/r-statistics/` 설계 명세를 실제 Claude Code plugin으로 구현한다.
> **정체성**: Claude를 도메인 중립 "통계 전문가"로 만드는 plugin (응용 도메인 비앵커).
> **진행 방식**: Phase 0 → 7 순차. 각 Phase는 명시된 `.metadata` 문서를 **반드시 참고**하고, 완료 기준을 충족한 뒤 다음으로.

## 0. 설계 출처 (필수 참고)
구현 전, `.metadata/r-statistics/`의 9개 문서를 정본으로 삼는다. Phase별 매핑:

| Phase | 참고 `.metadata` 문서 |
|-------|----------------------|
| 0 스캐폴딩 | `architecture.md`(디렉토리 트리) |
| 1 상수·타입 | `architecture.md`(규약), `mcp-tools.md`, `assert-rules.md` |
| 2 core | `mcp-tools.md`(크로스플랫폼·보안), `architecture.md`(FCA) |
| 3 MCP 도구 | `mcp-tools.md`, `assert-rules.md` |
| 4 R 계약·methods | `skills.md`, `assert-rules.md`, `spec.md` |
| 5 에이전트 | `agents.md` |
| 6 스킬 | `skills.md`, `dispatcher.md`, `spec.md` |
| 7 빌드·검증 | `roadmap.md`, `spec.md` |

## 0.1 불변 규약 (모든 Phase 공통)
- **FCA**: 프랙탈 분리 + 부속품 격리(`lib/`,`utils/`) + 상향식 지연 로딩. 각 프랙탈에 `index.ts` + `INTENT.md`.
- **1함수 1파일**: `operations/*.ts` 단일 export.
- **문자열 리터럴 상수화**: `src/types/enums.ts`(`as const`) + `src/constants/messages.ts`. 인라인 리터럴 금지.
- **hook 미사용.**
- **형식 레퍼런스**: `plugins/deilen`(MCP·빌드·구조), `plugins/filid/skills/cross-review`(오케스트레이션 스킬), `plugins/imbas/skills`(다중 스킬·provider 분기 패턴). 구현 시 이 실제 파일들을 그대로 참고.

---

## Phase 0 — 스캐폴딩 (다른 플러그인과 동일한 기본 구조)
**목적**: plugin 등록 + 빈 골격 + 빌드 파이프라인. `plugins/deilen` 구조를 1:1 복제하고 r-statistics용으로 치환.

- [ ] `plugins/r-statistics/` 디렉토리 생성
- [ ] `.claude-plugin/plugin.json` — deilen 형식 + **agents 필드 추가**(agents 보유 플러그인이므로 `plugins/filid/.claude-plugin/plugin.json`의 agents 등록 방식 확인 후 동일 적용)
  ```json
  {
    "name": "r-statistics",
    "version": "0.1.0",
    "description": "r-statistics — turn Claude into a domain-agnostic statistics expert: hypothesis testing, R code generation, reproducible analysis via headless Rscript",
    "author": { "name": "Vincent K. Kelvin" },
    "repository": "https://github.com/vincent-kk/ogham",
    "license": "MIT",
    "keywords": ["claude-code", "plugin", "statistics", "r", "hypothesis-testing"],
    "skills": "./skills/",
    "agents": "./agents/",
    "mcpServers": "./.mcp.json"
  }
  ```
- [ ] `package.json` — `@ogham/r-statistics`, `type: module`, `files: [bridge, skills, agents, .claude-plugin, .mcp.json, README.md]`, deps `@modelcontextprotocol/sdk`·`zod`, scripts `build`(clean→tsc→buildMcpServer)·`dev`·`test`
- [ ] `tsconfig.json`(extends `../../tsconfig.base.json`) + `tsconfig.build.json`
- [ ] `.mcp.json` — `{ "mcpServers": { "tools": { "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs"] } } }`
- [ ] `scripts/buildMcpServer.mjs` (deilen esbuild 번들 패턴)
- [ ] `vitest.config.ts`, `vitest.setup.ts`
- [ ] `README.md`, `README-ko_kr.md`, `INTENT.md`, `CLAUDE.md`
- **완료 기준**: `yarn build`가 빈 MCP 서버를 `bridge/mcp-server.cjs`로 번들. 플러그인 매니페스트 인식.

## Phase 1 — 상수 · 타입 (토대)
**목적**: 모든 문자열 상수·스키마를 한곳에. 이후 모든 Phase가 의존.
- [ ] `src/types/enums.ts` — `as const`: `JobStatus`, `RErrorCode`, `Severity`(`hard`/`soft`), `ExecutionMode`(`interactive`/`auto`), `Intent`, `PipelineState`, `AssumptionId`, `ArtifactKind`
- [ ] `src/constants/paths.ts` — 경로 상수 + `workspaceDir(id)` 헬퍼
- [ ] `src/constants/defaults.ts` — timeout, iteration guard 한계(methodology 3·rRepair 3·validator 2·total 25), 패키지 화이트리스트 등
- [ ] `src/constants/messages.ts` — 사용자/에러 메시지
- **참고**: `architecture.md`(규약), `mcp-tools.md`(인터페이스 타입), `dispatcher.md`(guard 값), `assert-rules.md`(AssumptionId)
- **완료 기준**: 인라인 문자열 리터럴 0건.

## Phase 2 — core 프랙탈
**목적**: 도메인 무지 실행 기반. FCA 프랙탈 3개.
- [ ] `src/core/rRuntime/` — `operations/{discoverRscript, spawnRscript, decodeOutput}.ts` + `index.ts` + `INTENT.md`
      (Rscript 탐색: config→env→PATH→공통경로→Windows 레지스트리 `HKLM\SOFTWARE\R-core\R`; `spawn(shell:false)`; UTF-8/CP949 디코딩)
- [ ] `src/core/workspace/` — `operations/{createWorkspace, collectArtifacts, readManifest, pruneExpired}.ts`
      (temp 격리, ARTIFACTS_DIR 수집·해시·symlink 거부, 세션 상태 영속)
- [ ] `src/core/commandGate/` — `operations/{validateCommand, resolveInstaller}.ts`
      (POSIX/MS-DOS 명령어 화이트리스트, r-setup 설치 명령 동의 게이트)
- [ ] `src/lib/`, `src/utils/` — 부속품(atomicWrite, logger, isoNow, randomId…)
- **참고**: `mcp-tools.md`(크로스플랫폼·보안 게이트), `architecture.md`(FCA)
- **완료 기준**: 각 프랙탈 `INTENT.md` + 1함수1파일 + 단위테스트(`__tests__/`).

## Phase 3 — MCP 도구 (4종)
**목적**: 결정적 실행 레이어.
- [ ] `src/mcp/server/lifecycle/{createServer, startServer}.ts` (deilen `registerTool` 패턴)
- [ ] `src/mcp/shared/helpers/{wrapHandler, toolResult, toolError}.ts`
- [ ] `src/mcp/tools/runR/` — `runR.ts` + `operations/`(래퍼 스크립트 생성, 아티팩트 수집)
- [ ] `src/mcp/tools/getRJob/`, `src/mcp/tools/cancelRJob/`
- [ ] `src/mcp/tools/assertAnalysisPlan/` — `operations/`(룰 평가: hard/soft, methods meta 소비)
- **참고**: `mcp-tools.md`(TS 인터페이스·annotations), `assert-rules.md`(룰셋)
- **완료 기준**: 4 도구 등록. `run_r`로 실제 R 스크립트 실행→PNG/JSON 아티팩트 수집 e2e 통과. `assert_analysis_plan` hard/soft 판정 단위테스트.

## Phase 4 — R 실행계약 + methods 카탈로그
**목적**: 통계 기법 lazy 리소스.
- [ ] `shared/contract.R` — header(set.seed·lib·ARTIFACTS_DIR)/footer(manifest.json·sessionInfo) 헬퍼(`add_artifact`,`write_json_artifact`,`save_plot_artifact`)
- [ ] `skills/analyze/references/methods/{technique}/` — 결정트리 전 기법에 `meta.yaml` + `template.R.tmpl`
      (t_test, paired_t, anova, mann_whitney, kruskal_wallis, wilcoxon, linear_regression, logistic_regression, poisson_regression, negative_binomial, cox_model, chi_square, fisher_exact, pearson_correlation, spearman_correlation, mixed_model …)
- **참고**: `skills.md`(methods 구조), `assert-rules.md`(meta.yaml 스키마·기법별 가정), `spec.md`
- **완료 기준**: 각 template이 contract 준수(파일 출력·print·manifest), meta.yaml이 assert와 연동.

## Phase 5 — 에이전트 (3종)
**목적**: 비결정 추론 레이어.
- [ ] `agents/statistician.md` (model: opus; WHAT — 기법 선택·SAP)
- [ ] `agents/r-expert.md` (model: sonnet; HOW — 코드·run_r·트러블슈팅; R 공식 리소스)
- [ ] `agents/methodology-validator.md` (model: sonnet; VALID — soft 검토)
- **참고**: `agents.md`(frontmatter·역할·hand-off 계약)
- **완료 기준**: `Task(subagent_type: "r-statistics:<id>")` 호출 가능. frontmatter(name·model·tools·maxTurns) 설정.

## Phase 6 — 스킬 (노출 6)
**목적**: 인터페이스 + 오케스트레이션.
- [ ] `skills/analyze/` — `SKILL.md`(Tier-2a preamble) + `references/{state-machine.md, intent.md, modes.md}` ← **Dispatcher**
- [ ] `skills/data-preparation/SKILL.md`
- [ ] `skills/assumption-check/SKILL.md`
- [ ] `skills/visualization/SKILL.md`
- [ ] `skills/reporting/SKILL.md`
- [ ] `skills/r-setup/` — `SKILL.md` + `references/{windows.md, macos.md, linux.md}`
- **참고**: `skills.md`(frontmatter·6 스킬·progressive disclosure), `dispatcher.md`(상태머신·전이표·guard·모드), `spec.md`(데이터 흐름)
- **완료 기준**: 노출 6 인식. `analyze`가 full-analysis 오케스트레이션(intent 분류→상태 전이→에이전트 호출→assert 게이트→리포팅), `--auto` 모드 동작.

## Phase 7 — 빌드 · 테스트 · 검증
- [ ] `buildMcpServer.mjs`로 번들 → `bridge/mcp-server.cjs`
- [ ] 통계 정확성 calibration 테스트 (filid `calibration/` 패턴: 알려진 데이터셋→기대 결과 대조)
- [ ] e2e: interactive(결과+대화) / `--auto`(무인 루프) 시나리오
- [ ] `renv` lockfile 초기 패키지 집합 고정 (stats, broom, ggplot2, rstatix, survival, lme4, MASS, car, gtsummary, arrow, data.table, jsonlite, quarto)
- [ ] `r-setup` 설치 명령 동의 UX 검증 (winget/choco/brew)
- **참고**: `roadmap.md`, `spec.md`(비채택 — 구현이 위반하지 않는지 대조)
- **완료 기준**: 전체 빌드+테스트 통과. 플러그인 등록·도구·스킬·에이전트 인식 확인.

---

## 의존성 그래프
```
Phase 0 (스캐폴딩)
  → Phase 1 (상수·타입)
    → Phase 2 (core)
      → Phase 3 (MCP 도구)
        → Phase 4 (R 계약·methods)  ┐
        → Phase 5 (에이전트)         ├ 병렬 가능
          → Phase 6 (스킬)          ┘ (4·5 완료 후)
            → Phase 7 (빌드·검증)
```

## 진행 규칙
1. 각 Phase 시작 전 매핑된 `.metadata` 문서를 읽고, 완료 후 그 문서와 대조 검수.
2. 모든 코드는 0.1 규약(FCA·1함수1파일·문자열 상수·hook 없음) 준수.
3. 형식이 모호하면 `plugins/deilen`·`plugins/filid`·`plugins/imbas` 실제 파일을 레퍼런스로.
4. `spec.md`의 **비채택** 목록을 구현이 위반하지 않는지 각 Phase 말에 점검(특히: 도메인 앵커링 금지, 자동 coercion 금지, 동적 패키지 설치 금지).
5. 설계 변경 발생 시 `.metadata/r-statistics/` 해당 문서를 먼저 갱신한 뒤 구현(문서가 정본).
