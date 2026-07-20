# 핸드오프 프롬프트 — 다음 세션 킥오프

> 아래 블록을 다음 세션 첫 프롬프트로 그대로 붙여넣으면 재조사 없이 바로 착수한다.
> 참조 스펙은 [handoff-codex-skill-variants.md](./handoff-codex-skill-variants.md).

---

`feature/issue-78-1` 브랜치에서 Codex 멀티호스트 작업을 이어간다. **먼저 읽어라**:

- `.metadata/plugin-compiler/handoff-codex-skill-variants.md` — 실행 스펙(파일 앵커·구현 6단계·transform·검증 게이트). **이게 정본이다.**
- `.metadata/plugin-compiler/TODO.md` — 전체 상태 표.
- `.metadata/plugin-compiler/stage6-codex-multiagent.md` — 검증 4종 정본(재실측 불요).

## 목표

컴파일러가 **Codex 전용 스킬 변이**를 `.codex-plugin/skills/` 로 방출해, Claude 위원회 스킬의
`Task/Agent(subagent_type: "<plugin>:<id>")` 스폰을 **self-load 스폰**("multi_agent subagent 띄워
`../_shared/personas/<id>.md` 읽어 완전 채택 후 원래 payload 대로 진행")으로 바꾸고, Codex
매니페스트 `skills` 를 `./.codex-plugin/skills/` 로 재지정한다. **`buildCodexSkills` builder 구현이 핵심.**

## 최우선 원칙 (절대)

- **Claude 무결손**: `skills/**`·`agents/**`·`.claude-plugin/**`·`.mcp.json`·`hooks/hooks.json` **바이트 불변**. 컴파일러는 Codex 전용 경로(`.codex-plugin/skills/`)에만 쓴다.
- **호스트 분기는 컴파일러에 집약** — 플러그인 소스에 산발 금지.
- 검증(multi_agent 스폰·subagent MCP 접근·스킬발견 replace·self-load 파일읽기)은 **이미 완료** — 다시 재지 말 것.

## 순서 (핸드오프 §구현 단계)

1. `src/types/facts.ts` `PluginFacts` + `src/facts/read/readPluginFacts.ts` 에 `agents/`·스킬 파일 읽기 추가(현재 skills 는 existsSync 뿐).
2. `src/adapters/builders/buildCodexSkills.ts` 신규 — 전 스킬 copy-all + `subagent_type` 스폰 스킬 변이 + `agents/<id>.md`→`.codex-plugin/skills/_shared/personas/<id>.md` 복사. `agents` 없거나 스폰 스킬 없으면 `null`.
3. `src/pipeline/steps/planPluginAdapters.ts` codexHooks 블록 뒤 배선 + `src/constants/adapterPaths.ts` 에 `CODEX_SKILLS_DIR`(claudeArtifacts 무충돌 확인).
4. `src/adapters/builders/buildCodexPluginManifest.ts` — 변이 방출 플러그인은 `skills` → `"./.codex-plugin/skills/"`.
5. **filid 크로스리뷰 파일럿**(`skills/cross-review/SKILL.md:186-227`, 페르소나맵 `contracts.md:8-21`)에서 transform 을 **라이브 E2E 1회로 확정** — append-protocol(스폰섹션에 표준 self-load 프로토콜 주입)이 실제 방출 스킬에서 작동하는지. **안 되면 스폰 블록 타깃 재작성으로 폴백.** 그 다음 prawf(이미 self-load → 무변환 확인)·entrez(하드 MCP, subagent MCP 접근으로 이식).
6. 각 대상 `package.json:files` 에 `.codex-plugin/skills` + `adapters:check` baseline 갱신 + `DETAIL.md` 어댑터 표.

## 커밋 전 게이트

`git diff` 로 **Claude 소비 파일 0 변경** grep 확인 · `yarn typecheck` · `build:all` · `test:run` · `lint` · `cennad typecheck:tests` · `plugin:adapters:check` 멱등.

## 함정 (반드시 지킬 것)

- **Codex 프로브는 항상 `codex exec ... < /dev/null -c model_reasoning_effort="low"`** — 프롬프트를 위치 인자로 주고 stdin 을 안 닫으면 stdin 대기로 **무한 블록**(지난 세션 1시간 손실). read-only 아닌 MCP 도구는 헤드리스 exec 에서 승인 게이트가 취소(정상). 테스트 플러그인/스킬은 쓰고 나면 **반드시 제거해 ~/.codex 원복**.
- **경로**: 변이 스킬은 `.codex-plugin/skills/<skill>/SKILL.md` 위치 → 페르소나는 `../_shared/personas/<id>.md`(robust, 검증됨) 참조. 플러그인 루트 `agents/`(`../../../`)는 취약하니 쓰지 말 것.
- **무결손 보장은 경로 상수 집합뿐**(코드 assertion 없음) — 새 상수가 Claude 경로와 안 겹치는지 반드시 확인.

**첫 액션**: 핸드오프 문서 정독 → `readPluginFacts.ts`·`planPluginAdapters.ts`·`buildCodexHooks.ts` 읽고 `buildCodexSkills` 착수.

---

## 상태 (킥오프 시점)

- 브랜치 `feature/issue-78-1`, 워킹트리 clean. 설계·검증·Task ③(C4-3 stateRoot) 커밋은 **origin/PR #89 반영됨**. 핸드오프 문서 커밋만 로컬일 수 있음(푸시 권장).
- `~/.codex` 원복 완료.
