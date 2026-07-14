# TODO — in-place 멀티호스트: 인수인계

> **Stage 1 실측 종료 (2026-07-15).** 게이트 **G1–G8 전부 닫힘**. 다음 세션의 시작점은 **[transition-plan.md](./transition-plan.md)** — Phase A 부터 순서대로 실행하면 된다.
> 사실 정본 [host-capability-matrix.md](./host-capability-matrix.md) · 절차 정본 [migration-playbook.md](./migration-playbook.md) · 정본 런타임 수정 [stage4-host-paths.md](./stage4-host-paths.md) · 도구 계약 [`tools/plugin-compiler/DETAIL.md`](../../tools/plugin-compiler/DETAIL.md).

## 완료 상태 (전제 — 검증 불요)

브랜치 `feature/issue-78-1`:

- 어댑터 4종 생성·커밋 (`.codex-plugin/plugin.json`×10 · `mcp_config.json`×9 · 루트 `.agents/plugins/marketplace.json`·`.agents/plugins.json`).
- **Codex `cwd` 블로커 수정 완료** — 이걸 안 고쳤으면 MCP 보유 9개 플러그인이 Codex 에서 전부 무음 사망한다.
- `yarn plugin:adapters:check` 통과(21 unchanged) · `typecheck` clean · `plugin-compiler` 스펙 99/99 · **Claude 소비 파일 diff 0**.
- **Claude 는 현행 그대로 동작(무수정).**

## 게이트 결과 (Stage 1 — 전부 종료)

| #      | 결과                                                                                                                                                       |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G1** | ✅ 도구명 `mcp__<server>__<tool>` · **플러그인 스코프 없음** ⇒ 서버명 오버라이드는 필수. **`cwd` 누락 블로커 발견·수정**                                   |
| **G2** | ✅ 신뢰된 훅은 헤드리스 `codex exec` 에서 **발화**하고 주입 문구가 모델에 도달. **미신뢰 훅은 조용히 스킵**(경고 없음) ⇒ cennad 위임 경로 주의             |
| **G3** | ✅ `plugin add` 는 enabled 만 · 첫 TUI 진입에서 trust 게이트 · `trusted_hash` 고정 · **"changed"** 가 재신뢰 트리거                                        |
| **G4** | ✅ **질문 자체가 틀렸다** — 상대 args 는 정상 해석된다. **위치**가 문제: `agy plugin install` 이 넣는 곳에선 MCP 가 안 뜨고 `.agents/plugins/` 에서만 뜬다 |
| **G5** | ✅ **오독 확정** — agy 가 Claude 포맷을 훅 이름 `"hooks"` 로 읽고 파싱 실패(`loaded 0 named hooks`) ⇒ agy 훅 전면 무동작                                   |
| **G6** | ✅ 스킬은 `<plugin>:<skill>` 로 정상 주입. 단 본문 full-form 도구명과 실제 Codex 도구명 **불일치 확정**                                                    |
| **G7** | ✅ **제약 확정** — Codex MCP 는 프로젝트 좌표를 잃는다(8 플러그인 / 31 지점). MCP `roots` 도 불가. → [stage4-host-paths.md](./stage4-host-paths.md)        |
| **G8** | ✅ **가정이 틀렸다** — `~/.codex/rules` 는 커맨드 승인 allowlist. 지침 채널은 **`AGENTS.md`**(루트·전역 둘 다 주입)                                        |

## 다음 작업

**→ [transition-plan.md](./transition-plan.md) 의 Phase A 부터.** 요약:

- **Phase A (이 브랜치)** — 어댑터 정정: `.agents/plugins.json` **제거**(무용지물 실증), 루트 `plugins/<n>/plugin.json` **추가**(agy 마커 — 단 **Codex 매니페스트 전체**를 담아야 한다. 최소 마커만 두면 Codex MCP 가 죽는다). **Claude 무결손 재설치 실증 필수.**
- **Phase B (이 브랜치)** — CI paths **선행** 수정 후 `adapters:check` 편입 + README 설치 절.
- **Phase C (`~/Workspace/ogham`)** — 정본 런타임 호스트 분기. 지시서 사본이 그 체크아웃에 배치돼 있다.
- **Phase D/E** — agy 훅(Stage 3) · Codex 심화(Stage 5). 선택.

## 재개 시 주의

- **이중 체크아웃 함정**: `~/Workspace/ogham`(main · 어댑터 0개) 과 `~/Workspace/ogham_mk2`(이 브랜치 · 어댑터 21개) 가 공존한다. 전자를 마켓플레이스로 등록하면 Codex 가 `.claude-plugin` fallback 으로 떨어져 **어댑터를 타지 않는 가짜 PoC** 가 된다. 등록 전 `find plugins -maxdepth 3 -path '*/.codex-plugin/plugin.json' | wc -l` = 10 확인.
- 어댑터는 **손편집 금지** — 정본 수정 후 `yarn plugin:adapters`.
- **PoC 잔여 (정리 필요 시)**: codex 에 마켓플레이스 `ogham` + `deilen`·`r-statistics`·`maencof-lens` 설치, `ogham_mk2` 신뢰 디렉터리, maencof-lens 훅 trust 등록.
  정리: `codex plugin remove <n>@ogham` → `codex plugin marketplace remove ogham`. agy 는 이미 정리됨.
