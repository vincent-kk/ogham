# TODO — in-place 멀티호스트: 세션 복원 지점

> **여기부터 읽으면 된다.** 2026-07-15 기준. 브랜치 `feature/issue-78-1`(어댑터·도구) + `~/Workspace/ogham`(정본 런타임) 두 갈래로 진행 중.

## 지금 상태 — 한 눈에

| 단계                            | 상태                                                                  |
| ------------------------------- | --------------------------------------------------------------------- |
| **Stage 1** 실측 게이트 G1–G8   | ✅ **전부 종료** (아래 표)                                            |
| **Phase A** 어댑터 정정         | ✅ 완료 (`42d5d898`)                                                  |
| **Phase B** CI·README 배선      | ✅ 완료 (`42d5d898`)                                                  |
| **Phase C** 정본 런타임 — 경로  | ✅ 완료 (main `77825966` — Vincent 님이 별도 진행)                    |
| **Phase C4** 정본 런타임 — 규칙 | ⬜ **다음 작업** → [stage4-rules-channel.md](./stage4-rules-channel.md) |
| **Phase D/E** agy·Codex 심화    | ⬜ 선택 → [backlog-d-e.md](./backlog-d-e.md)                          |
| main 머지 · GitHub 경유 설치 확인 | ⬜ (아래 "머지 전 주의" 필독)                                        |

**전체 계획 정본: [transition-plan.md](./transition-plan.md)** · 사실 정본: [host-capability-matrix.md](./host-capability-matrix.md) · 절차: [migration-playbook.md](./migration-playbook.md) · 도구 계약: [`tools/plugin-compiler/DETAIL.md`](../../tools/plugin-compiler/DETAIL.md)

---

## 어댑터 현황 (Phase A 이후)

생성물 **30 파일**, 경로 4종. 손편집 금지 — 정본 수정 후 `yarn plugin:adapters`.

```
plugins/<n>/plugin.json               ×10   ← 루트 매니페스트: agy 마커 + Codex 가 실제로 읽는 경로
plugins/<n>/.codex-plugin/plugin.json ×10   ← 위와 바이트 동일 (Codex 규약 경로)
plugins/<n>/mcp_config.json           × 9   ← agy MCP (상대 args + OGHAM_HOST)
.agents/plugins/marketplace.json      × 1   ← Codex 마켓플레이스
```

- **매니페스트가 왜 두 곳인가**: agy 는 루트 `plugin.json` 을 마커로 요구하고(없으면 우리 `mcp_config.json` 을 덮어써 `OGHAM_HOST` 파괴), Codex 도 그 경로를 읽어 `.codex-plugin` 을 **가린다**. 루트에 최소 마커만 두면 **Codex MCP 가 죽는다** → 두 곳에 같은 전체 매니페스트. 스펙이 바이트 동일을 고정.
- **`.agents/plugins.json`(agy declared)은 폐기됨** — 3가지 형식 모두 로드 실패 실증.
- Claude 무영향 실증 완료 (`--plugin-dir` 로딩 로그·경고 수 동일).

## 게이트 결과 (Stage 1 — 전부 종료)

| #      | 결과                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **G1** | 도구명 `mcp__<server>__<tool>` · **플러그인 스코프 없음** ⇒ 서버명 오버라이드 필수. **`cwd` 누락 블로커 발견·수정**(안 고쳤으면 MCP 9종 무음 사망) |
| **G2** | 신뢰된 훅은 헤드리스 `codex exec` 에서 발화하고 주입 문구가 모델에 도달. **미신뢰 훅은 경고 없이 조용히 스킵** ⇒ cennad 위임 경로 주의     |
| **G3** | `plugin add` 는 enabled 만 · 첫 TUI 진입에서 trust 게이트 · `trusted_hash` 고정 · **"changed"** 가 재신뢰 트리거                           |
| **G4** | agy 상대 args 는 정상 해석. **위치**가 문제 — `agy plugin install` 이 넣는 곳에선 MCP 가 안 뜨고 `.agents/plugins/` 에서만 뜬다            |
| **G5** | agy 가 Claude 훅 포맷을 훅 이름 `"hooks"` 로 오독 → 파싱 실패 → **훅 0개 로드**                                                            |
| **G6** | 스킬은 `<plugin>:<skill>` 로 정상 주입. 단 본문 full-form 도구명과 실제 Codex 도구명 **불일치 확정**                                       |
| **G7** | Codex MCP 는 프로젝트 좌표를 잃는다(MCP `roots` 도 불가) → hostPaths 헬퍼로 해소됨                                                          |
| **G8** | `~/.codex/rules` 는 **커맨드 승인 allowlist** 였다. 지침 채널은 **`AGENTS.md`**(루트·전역 둘 다 주입·중첩)                                 |

---

## ⚠ 머지 전 주의 (반드시 확인)

1. **main 이 앞서 있고 정본이 바뀌었다.** 특히 `b89e9be4` 에서 **filid MCP 서버명이 `t` → `tools`** 로 바뀌었다. 이 브랜치의 `.mcp.json` 은 아직 `t` 다.
   → **main 머지 후 반드시 `yarn plugin:adapters` 재실행 + 커밋.** 안 하면 CI 의 `plugin:adapters:check` 가 exit 1 로 잡는다(정상 동작).
2. **이중 체크아웃**: `~/Workspace/ogham`(정본 런타임 작업) · `~/Workspace/ogham_mk2`(이 브랜치). 마켓플레이스로 등록할 땐 **어댑터가 생성된 체크아웃**이어야 한다 — 아니면 Codex 가 `.claude-plugin` fallback 으로 떨어져 **어댑터를 타지 않는 가짜 PoC** 가 된다. 확인: `find plugins -maxdepth 3 -path '*/.codex-plugin/plugin.json' | wc -l` = 10.
3. **정본 체크아웃에 둔 의뢰서는 미추적 파일**이다 — 지난번 사본이 그래서 유실됐다. `~/Workspace/ogham/.metadata/plugin-compiler/stage4-rules-channel.md` 를 **커밋하거나 다른 곳으로 옮길 것**.
4. **기존 실패 4건**: cennad `skill-contract.acceptance.test.ts` — 스킬 본문에서 full-form 도구명이 빠졌는데 테스트는 아직 기대한다. 우리 변경과 무관(HEAD 에서도 재현). Phase E1 과 같은 주제.

## 호스트 PoC 상태

Codex·agy 플러그인은 **정리 완료**. 마켓플레이스 `ogham` 등록과 `ogham_mk2` 디렉터리 신뢰만 남아 있다(무해).

- 재실측이 필요하면: `codex plugin marketplace add /Users/Vincent/Workspace/ogham_mk2` → `codex plugin add <n>@ogham` → TUI 진입해 훅 trust 승인.
- 완전 정리: `codex plugin marketplace remove ogham` (+ `~/.codex/plugins/cache` 잔재 확인).
