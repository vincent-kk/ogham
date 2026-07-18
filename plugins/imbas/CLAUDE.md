# CLAUDE.md — @ogham/imbas

`@ogham/imbas` 패키지 작업 가이드. 패키지 contract 는 [INTENT.md](./INTENT.md), src 내부 구조는 [src/INTENT.md](./src/INTENT.md) 참조.

## Commands

```bash
yarn build              # clean → version:sync → settings-html → tsc → esbuild
yarn build:plugin       # mcp-server + hooks 번들만
yarn typecheck          # 타입 체크 (emit 없음)
yarn test:run           # 단일 실행 (CI)
yarn test               # watch
yarn format && yarn lint
yarn version:sync       # package.json → src/version.ts
```

## Pipeline Flow

```
Phase 1   → validate           (analyst)
Phase 2   → split              (planner + analyst reverse-inference)
Phase 2.5 → manifest-stories   (batch Jira / GitHub / local create)
Phase 3   → devplan            (engineer, EARS Subtask 생성)
Phase 3.5 → manifest-devplan   (batch Task / Subtask create)
```

- 각 실행은 `run_id` 를 갖고 `.imbas/runs/<id>/` 디렉토리에 state 저장
- manifest 파일 (`stories-manifest.json`, `devplan-manifest.json`) 이 생성 단위
- 에이전트 모델 매핑: analyst (sonnet) / planner (sonnet) / engineer (opus, maxTurns: 80)

## Anti-Yield Discipline

imbas 파이프라인은 다단계 + Task subagent spawn + Jira `[OP:]` 루프로 turn 끊김에 취약하다. Tier 분류와 3-layer 방어는 filid 와 동일 패턴:

- **Tier-1** (파이프라인): `pipeline` — 상단 EXECUTION MODEL preamble + phase-transition inline directives + DO NOT STOP callouts (Phase 2.5 → Phase 3 경계 + workflow.md 의 CRITICAL 참조)
- **Tier-2a** (다단계 비상호작용): 3-layer 동일 적용
- **Tier-2b** (단일 MCP 호출 기반): 간소화된 preamble
- **Tier-3** (단일 phase): preamble 추가 금지

**알려진 한계**: `engineer` (opus, maxTurns: 80) subagent-internal 컨텍스트 소진은 preamble 로 해결 불가. 체크포인트 파일 계약 follow-up 이슈 참조. 신규 skill 추가 시 `plugins/filid/skills/pipeline/SKILL.md` 의 3-layer 패턴 참조.

## Development Notes

- **버전**: `src/version.ts` 직접 수정 금지 — `yarn version:sync` 사용
- **테스트**: `src/**/__tests__/**/*.test.ts`
- **훅 직접 import 원칙**: 훅 도달 코드는 배럴(`index.js`) import 금지 — `constants/index.js` 대신 `constants/files.js` 등 구체 파일 직접 import (훅 번들 비대 방지, 루트 CLAUDE.md 참조)
- **Provider 경계**: skill 이 provider X 실행 시 `references/Y/**` 를 읽지 않음 (INTENT.md Boundaries 의 cross-provider leakage 금지와 동일)
- **MCP 도구 참조**: 에이전트/스킬은 full-form `mcp__plugin_imbas_tools__<tool>` 로 참조 (서버 키 `tools`). short-form `mcp_tools_*` 는 서브에이전트에서 해석되지 않아 도구 grant 실패를 유발하므로 사용 금지.
