# CLAUDE.md — @ogham/maencof

`@ogham/maencof` 패키지 작업 가이드. 패키지 contract 는 [INTENT.md](./INTENT.md), src 내부 구조는 [src/INTENT.md](./src/INTENT.md) 참조.

## Commands

```bash
yarn build              # clean → version:sync → tsc → esbuild (mcp-server + hooks)
yarn build:plugin       # esbuild 번들만 (mcp-server + hooks)
yarn typecheck          # 타입 체크 (emit 없음)
yarn test:run           # 단일 실행 (CI)
yarn test               # watch
yarn format && yarn lint
yarn version:sync       # package.json → src/version.ts
```

## Build System

- `scripts/build-mcp-server.mjs`: MCP 서버 번들 → `bridge/mcp-server.cjs`
- `scripts/build-hooks.mjs`: 이벤트별 디스패처 entry(`src/hooks/<event>/<event>.entry.ts`) → `bridge/<event>.mjs` (이벤트당 단일 번들; 관심사 핸들러를 한 프로세스에서 순차 실행)
- SessionStart 디스패처는 esbuild `.md → text` loader 로 `src/hooks/sessionStart/helpers/bootstrap/metaSkillBody.md` 를 인라인 (dialogue discipline meta-prompt). 본문 예산은 `META_SKILL_MAX_CHARS` — 초과 시 build-hooks.mjs 가드가 빌드를 실패시킨다.

## Auto-invocation Mapping

7 인지 역할 → 스킬 매핑 (사용자가 명시하지 않아도 트리거됨):

- **Brainstorm / ideation**: `explore --for-brainstorm` → `think --mode divergent`
- **Insight capture management**: `insight` (capture 자체는 `capture_insight` MCP 도구 + `insightInjector`, UserPromptSubmit 디스패처에 포함)
- **User-state awareness**: `personal-status` (capture 자체는 `capture_personal_context` MCP 도구 — SessionStart가 주입하는 `<personal-context>` 블록의 지침이 유도, 무배너)
- **Spec refinement / interview convergence**: `refine` (Phase 2.5 Socratic 포함)
- **Plan review**: `think --mode review`

자동 호출 체인:

- vague input → `refine`
- ambiguous requirement → `think --mode default`
- ideation signals ("아이디어" / "막막") → `explore --for-brainstorm` → `think --mode divergent`
- plan/spec path ref + "검토" → `think --mode review`
- skill / agent create / modify → `craft-skill` / `craft-agent`

## Session Lifecycle

- **Stop·SessionEnd 훅 없음**: Stop 은 매 턴 프로세스 spawn 비용 때문에, SessionEnd 는 Claude 전용 훅이라(3-호스트 이식 불가) 등록하지 않는다. 세션 종료 관심사는 **MCP 서버 수명주기**(`src/mcp/server/lifecycle/`)가 소유한다 — shutdown(exit/SIGINT/SIGTERM)이 동기 정밀 마감(turn-context 폐기 + env `CLAUDE_CODE_SESSION_ID` 세션 마감·캐시 삭제), 다음 부팅의 bootSweep 이 잔여 완결(sweep 마감 → prune → changelog 스캔 → 아카이빙 → 자동 커밋)을 보장한다. 매 턴 UserPromptSubmit `session-touch` 가 `lastActivityAt`/`usageSnapshot` 을 기록해 sweep 의 재료를 만들고, 오마감은 touch 재개방으로 자가치유된다.
- **Changelog debt**: MCP bootSweep 의 `changelogDebt` 가 감시 경로 미기록 변경을 부팅당 1회 스캔해 `.maencof-meta/changelog-state.json` 에 기록 → 같은 세션의 SessionStart 또는 다음 세션이 1줄 권고로 표면화 → `/maencof:changelog` 가 큐레이션 후 커서(lastCuratedAt) 갱신. 차단 없음.
- **Insight 통지**: capture 시점은 `capture_insight` 도구 응답 message(누적 개수 포함), 세션 간 집계는 다음 SessionStart 의 pending 알림이 담당. `reflect` 는 별도 vault judge 리포터이며 session-wide recap 에 매핑되지 않음.
- **Dialogue meta-prompt injection**: SessionStart 훅이 `src/hooks/sessionStart/helpers/bootstrap/metaSkillBody.md` 를 `<maencof-meta-skill>` 로 감싸 `hookSpecificOutput.additionalContext` 로 주입. **OFF-switch**: `MAENCOF_DISABLE_DIALOGUE=1` env 또는 `.maencof-meta/dialogue-config.json::injection.enabled=false`.
- **Personal-context 주입/정리**: SessionStart 가 companion 존재 시 `.maencof-meta/personal-context.json` 의 states/topics 를 `<personal-context>` 블록(캡처 지침 내장)으로 identity 직후 주입 → 대화 중 `capture_personal_context` 가 조용히 upsert → MCP bootSweep 의 `prunePersonalContext` 가 만료/보존 규칙 집행. **OFF-switch**: `personal-context.json::config.enabled=false` (`/maencof:personal-status --disable`). 설계 정본: `.metadata/maencof/Claude-Code-Plugin-Design/27-personal-context.md`.

## Development Notes

- **버전**: `src/version.ts` 직접 수정 금지 — `yarn version:sync` 사용
- **테스트**: `src/**/__tests__/**/*.test.ts`
- **훅 / bridge 변경**: `yarn build:plugin` 으로 재빌드
- **훅 직접 import 원칙**: 훅 도달 코드는 배럴(`index.js`) import 금지 — helper 는 `./helpers/<name>/<name>.js`, core 는 concrete 파일 경로로 직접 import (각 디스패처 INTENT.md Never do 와 동일, 루트 CLAUDE.md 참조)
- **MCP 도구 참조**: skills/agents 는 full-form `mcp__plugin_maencof_t__<tool>` 로 도구를 참조 (`.mcp.json` 서버 키 `t`). short-form `mcp_t_*` 는 서브에이전트에서 해석되지 않아 도구 grant 실패 → 디스크 직접 접근 폴백을 유발하므로 사용 금지.

## References

`../../.metadata/maencof/` — 5-Layer 스펙, MCP contract, agent / skill 정의, 훅 이벤트 매핑
