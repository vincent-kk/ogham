---
created: 2026-02-28
updated: 2026-04-16
tags: [architecture, plugin, hook, mcp, skill, agent, state-sharing, dialogue]
layer: meta
---

# 플러그인 아키텍처 — Hook/MCP/Skill/Agent 계층 + 상태 공유 + 대화 규율

## 개요

maencof은 4개 계층(Hook, MCP 도구, Skill, Agent)으로 구성된다.
각 계층은 [런타임 제약](./00-runtime-constraints.md) 내에서 동작한다.

대화 규율(meta-skill injection, session recap, InsightCategoryFilter, Socratic Elenchus)은
4계층 각 지점에서 분산 구현되며, §5에서 통합 뷰를 제공한다.

관련 문서: [설계 원칙](./01-design-principles.md) | [MCP 도구 명세](./17-mcp-tools.md) | [스킬 명세](./18-skills.md) | [에이전트 명세](./19-agents.md)

---

## 1. 4계층 역할

### Hook — 세션 경계 감지 + 무결성 가드 + 대화 규율 주입

- **SessionStart**:
  - 지식 트리 점검, 인덱스 로드, WAL 복구, Lazy Scheduling
  - 아키텍처 버전 체크 (L3 sublayer, L5 buffer/boundary 지원 여부)
  - Insight 자동 메타프롬프트 빌드 + pending 캡처 알림
  - **Meta-skill injection**: `src/hooks/session-start/meta-skill-body.md` 본문을 `<maencof-meta-skill>` XML 태그로 감싸 `hookSpecificOutput.additionalContext`로 system context에 주입 (`isDialogueInjectionDisabled()` 확인)
  - lifecycle-dispatcher
- **UserPromptSubmit**: lifecycle-dispatcher
- **PreToolUse**: Layer 1 문서 보호 경고 + lifecycle-dispatcher
- **PostToolUse**: 파일 변경 시 인덱스 무효화 (`stale-nodes.json`) + lifecycle-dispatcher
- **Stop**: lifecycle-dispatcher
- **SessionEnd**:
  - 세션 정리 + 영속화
  - **Session recap**: 수렴 요건/합의 전제/잠정 원리/미해결 긴장을 집계해 `[maencof] Session Recap` 메시지로 노출 (`isSessionRecapDisabled()` 확인)
  - `.maencof-meta/sessions/{YYYY-MM-DD-HHmmss}.md` 요약 저장
  - lifecycle-dispatcher
- **NotificationOutput** (신규 훅 타입):
  - **insight-injector**: `capture_insight` 상태를 XML로 노출
    ```xml
    <auto-insight status="active" sensitivity="medium" captured="3/10" allowed-categories="principle" />
    ```

**lifecycle-dispatcher**: `.maencof-meta/lifecycle.json`의 사용자 등록 액션(echo/remind)을 이벤트별로 디스패치. 항상 `continue: true` 반환 (비차단).

### MCP 도구 — 지식 그래프 핵심 기능

- CRUD 5 + 검색 6 + 캡처 2 + CLAUDE.md 3 + 운영 2 = 총 **18개** ([MCP 도구 명세](./17-mcp-tools.md))
- 신규 카테고리: 캡처(`capture_insight`, `boundary_create`), CLAUDE.md(`claudemd_merge/read/remove`), 운영(`dailynote_read`, `context_cache_manage`)

### Skill — 사용자 대면 명령

- 지식관리 5 + 지식그래프 4 + 인지작업 4 + 세션운영 4 + 운영 5 + 환경설정 7 = **사용자 호출 29개**
- **+ 비호출 meta-skill 1개** (`using-maencof`): SessionStart 훅이 매 세션 system context에 자동 주입. 본문은 `src/hooks/session-start/meta-skill-body.md`에 있으며 `skills/` 디렉토리 밖. [스킬 명세 §7](./18-skills.md)

### Agent — 특화 서브에이전트

총 **5개**, Layer 접근 범위를 명시적으로 제한 ([에이전트 명세](./19-agents.md)):
- `memory-organizer`: 문서 전이/정리
- `identity-guardian`: Layer 1 보호/갱신
- `checkup`: 진단 및 복구
- `configurator`: Project-scope 설정(`.claude/`, `.mcp.json`, `CLAUDE.md`, `.maencof-meta/`) 관리
- `knowledge-connector`: L3/L5 링크 제안, L5-Boundary 커넥터 관리 (`kg_suggest_links` 경유)

---

## 2. 상태 공유 전략

Hook, MCP, Skill이 동일 인덱스·설정에 접근하므로 상태 공유 규약 필요:

| 구분 | 접근 방식 | 제어 |
|------|----------|------|
| 읽기 (MCP, Hook) | 항상 허용 | 메모리 로드 스냅샷 |
| 쓰기 (Skill/CLI) | 배타적 | `.maencof/.lock` 파일 |
| 무효화 (Hook) | append-only | `.maencof/stale-nodes.json` |
| lifecycle.json | 읽기: Hook(lifecycle-dispatcher) | `.maencof-meta/lifecycle.json` |
| dialogue-config | 읽기: Hook(session-start/end, insight-injector) | `.maencof-meta/dialogue-config.json` |
| pending insights | 읽기/append: Hook, MCP `capture_insight` | `.maencof-meta/pending-insights/` |

---

## 3. 5-Layer ↔ 플러그인 계층 매핑

| Layer | 역할 | 주요 플러그인 계층 |
|-------|------|------------------|
| Layer 1 Core | Hub 노드, trust-level | Hook(보호), MCP(읽기) |
| Layer 2 Derived | 내재화, Dense cluster | MCP(CRUD), Agent(연결) |
| Layer 3A/B/C External | 외부 참조, Leaf (관계/구조/주제) | MCP(읽기), Skill(임포트) |
| Layer 4 Action | 작업 기억, Volatile | Hook(감지), Agent(정리) |
| Layer 5 Buffer/Boundary | 맥락 임시 저장 + 교차 레이어 커넥터 | MCP(읽기/create), Agent(`knowledge-connector`) |

---

## 4. ADR — filid와의 차별화

| 관점 | filid | maencof |
|------|-------|---------|
| 목적 | 코드 품질 규칙 강제 | 개인 지식공간 성장 지원 |
| Hook 역할 | 위반 감지 + 차단 | 이벤트 감지 + 안내 + 대화 규율 주입 |
| MCP 중심 | AST 분석 | 그래프 탐색, 기억 전이, 인사이트 캡처 |

---

## 5. 대화 규율 통합 뷰 (Dialogue Discipline Overview)

대화 규율은 4계층 각 지점에서 분산 구현되는 단일 시스템이다.

| 축 | 구현 지점 | 상세 위치 |
|----|----------|----------|
| Meta-skill injection | SessionStart Hook → `meta-skill-body.md` 본문 주입 | [18 §7](./18-skills.md) |
| Session recap | SessionEnd Hook → recap 메시지 빌드 (4요소) | [13 §5](./13-memory-lifecycle.md) |
| InsightCategoryFilter | `capture_insight` MCP 도구 + `insight-injector` 훅 | [17 §3, §6](./17-mcp-tools.md) |
| Socratic Elenchus | `maencof-refine` Phase 2.5 | [18 §3](./18-skills.md) |

### Off-switch (독립 3축)

| 축 | env | config |
|----|-----|--------|
| Meta-skill injection | `MAENCOF_DISABLE_DIALOGUE=1` (우선) | `dialogue-config.json::injection.enabled=false` |
| Session recap | (없음) | `dialogue-config.json::session_recap.enabled=false` |
| InsightCategoryFilter | (없음) | `dialogue-config.json::insight.category_filter.*` |

env override는 meta-skill injection에만 적용된다. session recap은 config로만 제어된다.
