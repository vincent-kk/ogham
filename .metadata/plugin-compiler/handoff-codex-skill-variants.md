# 핸드오프 — Codex 스킬 변이 구현 (②/§2 페르소나 이식)

> **바로 여기서 시작.** 브랜치 `feature/issue-78-1`. 설계·검증은 전부 끝났고, 남은 건
> **컴파일러 구현 하나**다. 원칙 최우선: **Claude `skills/`·`agents/` 바이트 불변**, 호스트
> 분기는 **컴파일러에 집약**(플러그인 소스에 산발 금지).

## 무엇을 만드나 (한 줄)

Claude 위원회 스킬은 `Task/Agent(subagent_type: "<plugin>:<id>")` 로 페르소나 subagent 를
스폰한다. Codex 엔 `subagent_type` 레지스트리가 없다. 컴파일러가 **Codex 전용 스킬 변이**를
`.codex-plugin/skills/` 로 방출해, 스폰을 **self-load 형**("subagent 띄워 `_shared/personas/<id>.md`
읽어 채택")으로 바꾸고, Codex 매니페스트 `skills` 를 그 dir 로 재지정한다. Claude 는 `./skills/` 를
그대로 쓴다.

## 검증 완료 (전부 ✅ — 재실측 불요)

정본: [stage6-codex-multiagent.md](./stage6-codex-multiagent.md) (Stage 6 + 6b).

1. **multi_agent 스폰·충실도** — 스킬로 전달된 페르소나 원장을 격리 subagent 로 스폰, 10인 스케일·충실도 확인 (`652efd81`).
2. **subagent MCP 접근** (`18d7fc7a`) — subagent 가 플러그인 MCP 도구를 컨텍스트 상속·호출(헤드리스 승인 게이트만 취소). ⇒ entrez(하드 MCP) 이식 가능.
3. **스킬 발견 = REPLACE** (`df70b4e3`) — 매니페스트 `skills` 는 선언 경로만 로드, 기본 `./skills/` 미로드. ⇒ `.codex-plugin/skills/` 로 재지정하면 Claude `./skills/` 충돌 없이 shadow. (스펙 "supplement" 문구는 실측과 반대 — 실측 정본.)
4. **self-load 파일읽기** (`69783f5e`) — "spawn subagent → Read `_shared/personas/<id>.md` → 채택" 이 신뢰성 있게 작동(별도 파일 마커로 증명, effort low).

## 핵심 사실 (조사 워크플로우 `persona-relocation-investigate` 결과)

- `agents/*.md` 는 Codex 설치에 **이미 배송**(local source 전체복사 + `package.json:files`) — 단 비활성. **재배치 아님, 읽어서 방출**.
- **쓰기 지점 단일**: `applyFiles.ts:21` `writeFileSync`, 유일 호출자 `main.ts:42`. builder 는 순수(디스크 미접촉).
- **무결손 보장 = 경로 상수 집합뿐**(코드 assertion 없음). ⚠ 새 상수가 Claude 경로와 겹치면 **아무것도 안 막는다** — 최대 리스크. `.codex-plugin/skills/` 는 `constants/claudeArtifacts.ts`(`.claude-plugin/**`·`.mcp.json`·`hooks/hooks.json`·`skills/`·`agents/`)와 안 겹침(안전).
- prawf 는 이미 self-load(`prompt-templates.md:47,206` "Read and follow the persona definition <AGENT_FILE>") → **무변환**. filid·entrez 는 `subagent_type` 레지스트리 주입만 → 변이 필요.

## 구현 단계 (파일 앵커 포함)

### 1. facts 확장 (`Ask first` 사안 — 이미 Vincent 승인)

- `src/types/facts.ts:3-11` `PluginFacts` 에 필드 추가: `agents: string[]`(agents/\*.md basename), `skillFiles`(스킬 경로→내용, 변이 판정·재작성용).
- `src/facts/read/readPluginFacts.ts:16-44` — 현재 skills 는 `existsSync` 뿐. `agents/` readdir + 스킬 파일 read 추가.

### 2. builder `buildCodexSkills` (신규)

- `src/adapters/builders/buildCodexSkills.ts` — 시그니처는 `buildCodexHooks.ts:33` 동형이되, 마크다운 다발이라 `{ relativePath: string; content: string }[] | null` 반환(또는 planPluginAdapters 에서 파일 배열 조립). `agents` 없거나 `subagent_type` 스폰 스킬 없으면 `null`.
- 산출물(플러그인당):
  - `.codex-plugin/skills/<skill>/**` — **전 스킬 copy-all**(발견이 replace 라 dir 전체 필요). `subagent_type` 스폰 스킬은 **변이**, 나머지는 바이트 복사.
  - `.codex-plugin/skills/_shared/personas/<id>.md` — 각 `agents/<id>.md` 복사(변이 스킬이 `../_shared/personas/<id>.md` 로 참조 — 검증된 robust 패턴).
- `src/adapters/index.ts:1-6` 에 export 추가.

### 3. 배선

- `src/pipeline/steps/planPluginAdapters.ts:51-57` — codexHooks 블록 뒤·return 앞에서 `buildCodexSkills(facts)` 호출 → non-null 이면 `files.push({ absolutePath: join(directory, relPath), content })`.
- `src/constants/adapterPaths.ts` — `CODEX_SKILLS_DIR = ".codex-plugin/skills"` 추가(claudeArtifacts 와 무충돌 확인).
- `src/adapters/builders/buildCodexPluginManifest.ts:29-37` — 변이 방출한 플러그인은 `skills` 값을 `"./.codex-plugin/skills/"` 로(아니면 `"./skills/"` 유지).

### 4. transform (스폰 재작성) — **여기 하나만 구현 중 E2E 확정 필요**

`subagent_type` 스폰을 self-load 로 바꾸는 결정론적 방법:

- **시작 가설(권장)**: 변이 SKILL.md 상단/스폰섹션에 **표준 프로토콜 블록 주입**(append, 프로즈 재작성 아님) — _"이 호스트에서 `subagent_type: \"<plugin>:<id>\"` 스폰 = multi_agent subagent 를 띄워 먼저 `_shared/personas/<id>.md` 를 Read 후 완전 채택하고 원래 payload/계약대로 진행."_ 결정론적·플러그인 무관.
- **잔여 확인**: 검증 #4 는 "스킬이 직접 spawn+read 지시" 를 확인했다. "기존 `subagent_type` 호출 + 주입 프로토콜로 해석" 은 인접하나 미확인 — **filid 파일럿에서 실제 방출 스킬로 라이브 E2E 1회**(effort low, stdin 닫기)로 확정. 안 되면 스폰 블록 **타깃 재작성**으로 폴백(스폰 지시 텍스트를 인지해 교체).

### 5. 파일럿 순서 + 플러그인별 스폰 지점

- **filid 크로스리뷰**(순수추론 위원회, 먼저): 스폰 `skills/cross-review/SKILL.md:186-192`, 워커 프롬프트 `:198-227`, 위원회 배열 `elect-committee`→session.md(`:118`,`:131`), 페르소나 id→파일 `skills/cross-review/contracts.md:8-21`. **데이터 주도 스폰**(리터럴 아님)이라 transform 이 여기서 검증돼야 일반화.
- **prawf**: `skills/peer-review/prompt-templates.md:47,206` 이미 self-load → **무변환 확인만**.
- **entrez**(하드 MCP, 마지막): `skills/search/SKILL.md:44`(generation)·`:51`(rerank), `skills/query/SKILL.md:19`. 페르소나 `agents/paper-search-expert.md`. subagent MCP 접근(검증 #2)으로 이식.

### 6. 배선 마무리

- 각 대상 플러그인 `package.json:files` 에 `.codex-plugin/skills` 추가(`DETAIL.md:44` 파리티).
- `plugin:adapters:check` baseline 갱신(현 35 → 변이 방출 수만큼 증가). `DETAIL.md:23-32` 어댑터 표에 7번째 추가.

## 검증 게이트 (커밋 전)

- `plugin:adapters:check` — 새 baseline 멱등.
- **Claude 무결손**: `git diff` 에 `skills/**`·`agents/**`·`.claude-plugin/**`·`.mcp.json`·`hooks/hooks.json` **0 변경** (grep 로 확인).
- `yarn typecheck` · `build:all`(훅 번들 가드) · `test:run`(전체) · `lint` · `cennad typecheck:tests`.
- **라이브 E2E**: 변이 filid 를 Codex 마켓플레이스로 설치 → 위원회 스폰 실제 발화·페르소나 채택 확인(검증 #4의 self-load 가 실제 방출 스킬에서 동작하는지). 정리로 원복.

## 리스크·함정

- **copy-all 부피**: `.codex-plugin/skills/` 가 전 스킬 복사 → 큰 diff(매니페스트 바이트복사처럼 drift-gated, 무해). filid 19·maencof 28 스킬은 파일 多.
- **경로 해석**: 변이 스킬은 `.codex-plugin/skills/<skill>/SKILL.md` 위치 → 플러그인 루트 `agents/` 는 `../../../agents/`(취약). 그래서 페르소나를 `_shared/personas/` 로 복사하고 `../_shared/personas/<id>.md`(robust) 참조 — 검증된 패턴.
- **승인 UX**: entrez 등 tool-using 페르소나는 인터랙티브 Codex 에서 subagent MCP 호출마다 승인 유발 가능(기능 아닌 UX). 신뢰 설치 시 완화.
- **prettier**: `.metadata/**` md 는 저장 시 재정렬됨(정상).
- **Codex 프로브 필수 습관**: `codex exec` 는 **항상 `< /dev/null`(또는 `- < file`) + `-c model_reasoning_effort="low"`** — 위치 인자 + stdin 미지정이면 stdin 대기로 **무한 블록**(이번 세션 1시간 손실 원인). read-only 아닌 MCP 도구는 헤드리스에서 승인게이트 취소(정상).

## 빠른 시작

```bash
git checkout feature/issue-78-1        # 워킹트리 clean, origin 대비 +6 (미푸시)
# 1) facts 확장 → 2) buildCodexSkills → 3) planPluginAdapters 배선 → 4) manifest skills 재지정
# 5) filid 파일럿 transform + 라이브 E2E 확정 → prawf(무변환) → entrez(MCP)
# 6) files[] + adapters:check baseline + 게이트 전체
```

## 상태 스냅샷 (핸드오프 시점)

- 브랜치 `feature/issue-78-1`, 워킹트리 clean. **커밋 `553bf223`…`69783f5e` 는 origin 반영됨** — **PR #89 에 C4-3 stateRoot 코드 + 설계 문서 포함**(모든 CI 게이트 로컬 통과 확인, 원격 CI 는 재확인 권장). 이 핸드오프 커밋만 로컬일 수 있음 → 다음 세션 전 푸시.
- `~/.codex` 원복 완료(테스트 플러그인·스킬 전부 제거).
- 완료: Task ① C4-3 문서 · Task ③ C4-3 stateRoot 구현 · ② 검증 3종.
