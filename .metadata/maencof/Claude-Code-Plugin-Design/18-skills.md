---
created: 2026-02-28
updated: 2026-04-16
tags: [skill, context-injection, knowledge-tree, search, cognitive, meta-skill]
layer: design-area-4
---

# 스킬 명세 — 사용자 호출 29개 + 비호출 meta-skill 1개

## 개요

사용자가 `/maencof:명령` 형태로 호출하는 확장 기능(29개). 지식 트리 + 검색 엔진 컨텍스트를
주입하여 기억 인식 상태에서 실행된다.

Phase 2에서 **인지 작업 스킬**(think/refine/insight/suggest)과 **세션 운영 스킬**
(dailynote/cleanup/changelog/migrate)이 추가되었다. 또한 사용자가 직접 호출하지 않고
SessionStart 훅이 매 세션 system context에 주입하는 비호출 **메타스킬**(`using-maencof`)이
대화 규율을 형성한다.

관련 문서: [플러그인 아키텍처](./16-plugin-architecture.md) | [에이전트 명세](./19-agents.md) | [온보딩 플로우](./23-onboarding-flow.md)

---

## 1. 지식 관리 스킬 (5)

| 스킬 | 호출 | 역할 | context_layers |
|------|------|------|----------------|
| setup | `/maencof:maencof-setup` | 초기 온보딩, Core Identity 수집 | L1 |
| remember | `/maencof:maencof-remember` | 새 지식 기록 | L2, L3, L4, L5 |
| recall | `/maencof:maencof-recall` | 지식 검색/회상 | L1, L2, L3 |
| organize | `/maencof:maencof-organize` | 기억 정리/전이 | L2, L4, L5 |
| reflect | `/maencof:maencof-reflect` | 볼트 관점 저지먼트 리포터 (세션 recap과 직교) | L1, L2, L3 |

---

## 2. 지식 그래프 스킬 (4)

| 스킬 | 호출 | 역할 | Phase |
|------|------|------|-------|
| build | `/maencof:maencof-build` | 전체/증분 인덱스 구축 | 1 |
| explore | `/maencof:maencof-explore` | 대화형 SA 기반 지식 탐색. `--for-brainstorm` 옵션으로 5-8개 seed 생성 후 `think --mode divergent` 핸드오프 | 1 |
| rebuild | `/maencof:maencof-rebuild` | 인덱스 강제 전체 재구축 | 1 |
| diagnose | `/maencof:maencof-diagnose` | 인덱스 건강도 진단 (고아, 깨진 링크) | 1 |

---

## 3. 인지 작업 스킬 (4)

사용자의 추론·정제·포착을 돕는 스킬 묶음. 대화 규율(meta-skill) 자동 호출 체인의 중심.

| 스킬 | 호출 | 역할 | 핵심 기능 |
|------|------|------|----------|
| think | `/maencof:maencof-think` | 다중 해석 / ToT 탐색 | 3-mode: **default**(표준 해석, 5축 복잡성·커버리지·UX·유지보수·팀 역량), **divergent**(참신성 우선), **review**(위험 역전) |
| refine | `/maencof:maencof-refine` | Spec 정제 | Phase 1(수렴)-2(분해)-**2.5 Socratic Elenchus**-3(검증)-4(확정). Phase 2.5는 가정 표면화(2.5.a) + 반례 탐색(2.5.b) + Immutable Objects 모순 검사(2.5.c). 5-8턴 예산, 최대 1 라운드 back-edge |
| insight | `/maencof:maencof-insight` | 인사이트 뷰어 + 필터 관리 | `--category <principle\|refuted\|ephemeral> --accept\|--reject`. 캡처 실행 자체는 MCP `capture_insight` 도구 전담 |
| suggest | `/maencof:maencof-suggest` | 링크/전이 후보 제안 | `kg_suggest_links` 경유, `knowledge-connector` 에이전트와 협업 |

### think 모드별 평가 축

| 모드 | 5개 평가 축 |
|------|------------|
| default | 복잡성, 커버리지, UX, 유지보수성, 팀 역량 |
| divergent | 참신성, 실행가능성, 커버리지, UX, 팀 역량 |
| review | 위험, 커버리지, 범위, UX, 팀 역량 |

### refine Phase 2.5 Socratic Elenchus

Phase 2 분해 결과의 합의된 전제가 **실제 합의인지** 검증하는 대화 레이어.
기각된 전제는 `capture_insight(category=refuted_premise)`로 시도되며, 기본 정책에서는
거부된다(`InsightCategoryFilter`). maencof-think의 review 모드와 차이: think-review는 산출물
비판, refine 2.5는 대화 수렴 게이트. 상세: `skills/maencof-refine/knowledge/socratic-elenchus.md`.

---

## 4. 세션 운영 스킬 (4)

| 스킬 | 호출 | 역할 |
|------|------|------|
| dailynote | `/maencof:maencof-dailynote` | 일일 노트 기록, SessionEnd recap의 원천 데이터 |
| cleanup | `/maencof:maencof-cleanup` | 볼트 잔여물(stale/orphan/broken link) 정리 |
| changelog | `/maencof:maencof-changelog` | 볼트 변경 기록 (changelog-gate + writer 파이프라인) |
| migrate | `/maencof:maencof-migrate` | 아키텍처 버전 마이그레이션 (예: L3 단일 → L3A/B/C 서브레이어, L5 단일 → buffer/boundary) |

---

## 5. 운영 스킬 (5)

| 스킬 | 호출 | 역할 |
|------|------|------|
| checkup | `/maencof:maencof-checkup` | 6개 진단 + 자동 수정 (checkup 에이전트 orchestrator) |
| ingest | `/maencof:maencof-ingest` | 외부 데이터 가져오기 |
| connect | `/maencof:maencof-connect` | 외부 데이터 소스 등록 |
| mcp-setup | `/maencof:maencof-mcp-setup` | 외부 MCP 서버 설치 |
| manage | `/maencof:maencof-manage` | 스킬/에이전트 활성화 관리 |

---

## 6. 환경 설정 스킬 (7, orchestrator: configurator)

| 스킬 | 호출 | 역할 |
|------|------|------|
| configure | `/maencof:maencof-configure` | 통합 환경 설정 진입점 (router) |
| bridge | `/maencof:maencof-bridge` | MCP 설치+등록+워크플로우 스킬 생성 |
| craft-skill | `/maencof:maencof-craft-skill` | 커스텀 스킬 생성기 |
| craft-agent | `/maencof:maencof-craft-agent` | 커스텀 에이전트 생성기 |
| instruct | `/maencof:maencof-instruct` | CLAUDE.md 섹션 관리 (MCP `claudemd_*` 경유) |
| rule | `/maencof:maencof-rule` | 규칙 관리 |
| lifecycle | `/maencof:maencof-lifecycle` | 라이프사이클(`.maencof-meta/lifecycle.json`) 관리 |

설정 스킬은 `context_layers: []` — 지식 Layer를 사용하지 않고 프로젝트 설정 파일만 다룸.

---

## 7. 비호출 Meta-skill (1) — using-maencof

**사용자가 `/maencof:`로 호출할 수 없는** 단일 메타스킬. 대화 규율의 본문을 담당.

### 위치
- 본문: `packages/maencof/src/hooks/session-start/meta-skill-body.md`
- `skills/` 디렉토리에는 **존재하지 않음** (user-invocable=false 원칙)

### 주입 메커니즘
1. 빌드 시 esbuild `.md → text` 로더가 `meta-skill-body.md`를 session-start 훅 번들에 인라인
2. 매 세션 SessionStart 훅이 본문을 `<maencof-meta-skill>` XML 태그로 감쌈
3. `hookSpecificOutput.additionalContext`로 system context에 주입
4. 최대 ~2500 Unicode 문자. 초과 시 조용히 스킵 (에러 아님)

### 6 인지 역할 → 스킬 매핑

| 인지 역할 | 트리거 신호 | 스킬 체인 |
|----------|------------|----------|
| Brainstorm / ideation | "아이디어", "막막", 후보 미지정 | `explore --for-brainstorm` → `think --mode divergent` |
| Insight 관리 | 캡처/필터 조회 | `insight` + MCP `capture_insight` |
| Spec refinement | 모호한 입력 | `refine` (Phase 2.5 Socratic 포함) |
| Interview convergence | 질문 예산 내 수렴 | `refine` Phase 2.5 |
| Plan review | plan/spec 경로 + "검토" 신호 | `think --mode review` |
| Retrospective | (사용자 트리거 없음, SessionEnd 자동) | Session recap → [13 §5](./13-memory-lifecycle.md) |

### Auto-invocation 체인
- 모호한 입력 → `refine`
- refine 완료 후 대안 잔존 → `think --mode default`
- 다중 해석 가능한 요구사항 → `think --mode default`
- ideation 신호 + 후보 미지정 → `explore --for-brainstorm` → `think --mode divergent`
- plan/spec + "검토" 신호 → `think --mode review`

### Off-switch

| 축 | 제어 |
|----|------|
| meta-skill injection | env `MAENCOF_DISABLE_DIALOGUE=1` (우선) 또는 `.maencof-meta/dialogue-config.json::injection.enabled=false` (OR 시맨틱) |
| session recap | `.maencof-meta/dialogue-config.json::session_recap.enabled=false` (env override **없음**, 독립 축) |
| InsightCategoryFilter | `.maencof-meta/dialogue-config.json::insight.category_filter.<principle\|refuted_premise\|ephemeral_candidate>` |

`maencof-reflect`는 volt 관점 저지먼트 리포터이며, SessionEnd recap과 **직교**(혼동 금지).

---

## 8. 컨텍스트 주입 시퀀스

```
1. /maencof:스킬명 호출
2. skills/스킬명/SKILL.md에서 system prompt 로드
3. context_layers 설정에 따라 문서 수집
4. SA 엔진으로 연관 문서 확산 탐색
5. 토큰 예산 내에서 컨텍스트 주입
```

인지 작업 스킬(think/refine)은 `context_layers` 외에 **대화 세션 상태**(pending 인사이트, 이전
turn의 surfacing된 전제)를 추가 입력으로 소비한다.

---

## 9. Progressive Autonomy와 스킬 실행

| Level | 스킬 실행 방식 |
|-------|--------------|
| Level 0-1 | 모든 스킬 실행 전 승인 필요 |
| Level 2 | 자율 실행 (쓰기 동작 시 제안 후 확인) |
| Level 3 | 완전 자율 실행 |

상세: [22-autonomy-levels.md](./22-autonomy-levels.md)

---

## 10. 스킬 정의 위치

```
packages/maencof/skills/
├── 지식 관리 (5)
│   ├── maencof-setup, maencof-remember, maencof-recall, maencof-organize, maencof-reflect
├── 지식 그래프 (4)
│   ├── maencof-build, maencof-explore, maencof-rebuild, maencof-diagnose
├── 인지 작업 (4)
│   ├── maencof-think, maencof-refine, maencof-insight, maencof-suggest
├── 세션 운영 (4)
│   ├── maencof-dailynote, maencof-cleanup, maencof-changelog, maencof-migrate
├── 운영 (5)
│   ├── maencof-checkup, maencof-ingest, maencof-connect, maencof-mcp-setup, maencof-manage
└── 환경 설정 (7)
    └── maencof-configure, maencof-bridge, maencof-craft-skill, maencof-craft-agent,
        maencof-instruct, maencof-rule, maencof-lifecycle
```

각 스킬 디렉토리에 선택적 `reference.md`, `examples.md`, `knowledge/` 포함 가능.
특히 `maencof-refine/knowledge/socratic-elenchus.md`, `maencof-think/knowledge/evaluation-criteria.md`,
`tot-methodology.md`가 Phase 2 추가되었다.

**비호출 메타스킬**의 본문은 `skills/` 밖에 있다:
- `packages/maencof/src/hooks/session-start/meta-skill-body.md`

사용자 정의: `.maencof-meta/custom-skills/` ([등록 및 버전 관리](./20-registry-versioning.md))
