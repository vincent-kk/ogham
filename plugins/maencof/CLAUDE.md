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
- `scripts/build-hooks.mjs`: 각 훅 entry → `bridge/<name>.mjs`
- SessionStart 훅은 esbuild `.md → text` loader 로 `src/hooks/sessionStart/metaSkillBody.md` 를 인라인 (dialogue discipline meta-prompt)

## Auto-invocation Mapping

6 인지 역할 → 스킬 매핑 (사용자가 명시하지 않아도 트리거됨):

- **Brainstorm / ideation**: `explore --for-brainstorm` → `think --mode divergent`
- **Insight capture management**: `insight` (capture 자체는 `capture_insight` MCP 도구 + `insightInjector` bridge)
- **Spec refinement / interview convergence**: `refine` (Phase 2.5 Socratic 포함)
- **Plan review**: `think --mode review`

자동 호출 체인:

- vague input → `refine`
- ambiguous requirement → `think --mode default`
- ideation signals ("아이디어" / "막막") → `explore --for-brainstorm` → `think --mode divergent`
- plan/spec path ref + "검토" → `think --mode review`
- skill / agent create / modify → `craft-skill` / `craft-agent`

## Session Lifecycle

- **Session recap**: SessionEnd 훅이 `[maencof] Session Recap` 을 자동 출력 (명시 호출 불필요). `reflect` 는 별도 vault judge 리포터이며 session-wide recap 에 매핑되지 않음.
- **Dialogue meta-prompt injection**: SessionStart 훅이 `src/hooks/sessionStart/metaSkillBody.md` 를 `<maencof-meta-skill>` 로 감싸 `hookSpecificOutput.additionalContext` 로 주입. **OFF-switch**: `MAENCOF_DISABLE_DIALOGUE=1` env 또는 `.maencof-meta/dialogue-config.json::injection.enabled=false`.

## Development Notes

- **버전**: `src/version.ts` 직접 수정 금지 — `yarn version:sync` 사용
- **테스트**: `src/**/__tests__/**/*.test.ts`
- **훅 / bridge 변경**: `yarn build:plugin` 으로 재빌드

## References

`../../.metadata/maencof/` — 5-Layer 스펙, MCP contract, agent / skill 정의, 훅 이벤트 매핑
