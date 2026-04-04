# imbas Implementation Plan

> Status: Draft v1.1 (2026-04-04) — Provider abstraction added
> Blueprint: [BLUEPRINT.md](./BLUEPRINT.md)

---

## Phase 0: 기반 구조

### 0.1 디렉토리 & 플러그인 스캐폴딩
- [ ] imbas 플러그인 디렉토리 구조 생성 (skills/, agents/, references/)
- [ ] plugin.json 또는 플러그인 매니페스트 작성
- [ ] .gitignore 템플릿 준비

**Spec:** [SPEC-state.md §2](./specs/SPEC-state.md) — .imbas/ 디렉토리 구조

### 0.2 config.json 스키마 확정 & 구현
- [ ] config.json 스키마 최종 확정 (provider 필드 포함)
- [ ] 기본값(defaults) 결정
- [ ] 언어 설정 구조 확정 (`issue_content` 통합)
- [ ] provider별 config 섹션 (jira, github) 구조 확정

**Spec:** [SPEC-state.md §3](./specs/SPEC-state.md) — config.json 스키마

### 0.3 Provider Abstraction 기반
- [ ] 필드 리네임 확정 (`project_ref`, `issue_ref`, `epic_ref`)
- [ ] Provider별 프로젝트 디렉토리명 규칙 (Jira: `KEY`, GitHub: `owner--repo`)
- [ ] GitHub label 스키마 + 자동 생성 로직 정의
- [ ] Body meta block 파싱 규격 확정

**Spec:** [SPEC-provider.md](./specs/SPEC-provider.md), [SPEC-provider-github.md](./specs/SPEC-provider-github.md)

---

## Phase 1: Infrastructure Skills

### 1.1 imbas:setup 구현
- [ ] SKILL.md 작성
- [ ] init subcommand — 대화형 초기화, config.json 생성
- [ ] show subcommand — 현재 설정 표시
- [ ] set-project, set-language subcommands
- [ ] .gitignore 가드 (setup-lens 패턴)
- [ ] Jira 프로젝트 캐시 초기 수집

**Spec:** [SPEC-skills.md §3.1](./specs/SPEC-skills.md) — imbas:setup
**Reference:** `/Users/Vincent/Workspace/ogham/packages/maencof-lens/skills/setup-lens/SKILL.md`

### 1.2 imbas:cache 구현 (internal skill)
- [ ] ensure — TTL 내면 스킵, 만료면 자동 갱신
- [ ] refresh — Jira 메타데이터 강제 재수집
- [ ] clear — 캐시 삭제
- [ ] 사용자 접근 경로: setup show / setup refresh-cache

**Spec:** [SPEC-skills.md §6.2](./specs/SPEC-skills.md) — imbas:cache (Internal)

### 1.3 imbas:status 구현
- [ ] SKILL.md 작성
- [ ] 최근 런 상태 표시
- [ ] list — 전체 런 이력
- [ ] resume — 중단된 런 재개 안내

**Spec:** [SPEC-skills.md §3.2](./specs/SPEC-skills.md) — imbas:status

---

## Phase 2: Agent Reference Material

### 2.1 imbas-analyst references 준비
- [ ] validation-types.md — 4종 검증 유형 상세 + 예시
- [ ] report-template.md — 검증 리포트 템플릿
- [ ] reverse-inference-protocol.md — 역추론 검증 프로토콜
- [ ] cross-system-search-patterns.md — Confluence/Jira 병렬 검색 패턴 (search-company-knowledge에서 흡수)

**Spec:** [SPEC-agents.md §2](./specs/SPEC-agents.md) — imbas-analyst

### 2.2 imbas-planner references 준비
- [ ] invest-criteria.md — INVEST 체크리스트 + 예시
- [ ] story-templates.md — User Story + AC 템플릿
- [ ] epic-templates.md — Epic Description 5종 (spec-to-backlog에서 흡수)
- [ ] ticket-writing-guide.md — 티켓 작성 가이드 (spec-to-backlog에서 흡수)
- [ ] breakdown-examples.md — 분해 예시 (spec-to-backlog에서 흡수)
- [ ] horizontal-split-guide.md — 수평 분할 메커니즘 + umbrella 패턴
- [ ] jira-hierarchy.md — 이슈 계층/타입/네이밍 규칙

**Spec:** [SPEC-agents.md §3](./specs/SPEC-agents.md) — imbas-planner
**Source:** `/Users/Vincent/Workspace/ogham/.metadata/imbas/official/jira_best_case.md`, `jira_report.md`

### 2.3 imbas-engineer references 준비
- [ ] ears-format.md — EARS Subtask 포맷 + 종료조건
- [ ] code-exploration-protocol.md — 도메인 시드 기반 코드 탐색
- [ ] task-extraction-rules.md — 중복 감지 + Task 추출
- [ ] ba-feedback-protocol.md — B→A 피드백 규칙
- [ ] jql-patterns.md — 중복 감지용 JQL (generate-status-report에서 흡수)

**Spec:** [SPEC-agents.md §4](./specs/SPEC-agents.md) — imbas-engineer

### 2.4 imbas-media references 준비
- [ ] frame-analysis-protocol.md — 키프레임 분석 프로토콜
- [ ] analysis-schema.md — analysis.json 스키마 + 예시

**Spec:** [SPEC-agents.md §5](./specs/SPEC-agents.md) — imbas-media

---

## Phase 3: Agent Definitions

### 3.1 imbas-analyst.md 작성
- [ ] Frontmatter (name, description, model, tools)
- [ ] Identity & role definition
- [ ] Validation workflow instructions
- [ ] Reverse-inference verification instructions
- [ ] References 링크

**Spec:** [SPEC-agents.md §2](./specs/SPEC-agents.md)

### 3.2 imbas-planner.md 작성
- [ ] Frontmatter
- [ ] Story decomposition instructions
- [ ] INVEST evaluation rubric
- [ ] 3→1→2 verification participation
- [ ] Size check + horizontal split instructions
- [ ] References 링크

**Spec:** [SPEC-agents.md §3](./specs/SPEC-agents.md)

### 3.3 imbas-engineer.md 작성
- [ ] Frontmatter
- [ ] Code exploration protocol
- [ ] EARS Subtask generation instructions
- [ ] Task extraction + dedup detection
- [ ] B→A feedback rules
- [ ] References 링크

**Spec:** [SPEC-agents.md §4](./specs/SPEC-agents.md)

### 3.4 imbas-media.md 작성
- [ ] Frontmatter
- [ ] Frame analysis workflow
- [ ] Scene classification instructions
- [ ] Output format (analysis.json)
- [ ] References 링크

**Spec:** [SPEC-agents.md §5](./specs/SPEC-agents.md)

---

## Phase 4: Core Workflow Skills

### 4.1 imbas:validate 구현
- [ ] SKILL.md 작성
- [ ] Run 초기화 로직 (state.json, source.md 복사)
- [ ] Confluence URL 해석 (getConfluencePage)
- [ ] imbas-analyst 호출 프롬프트
- [ ] 결과 평가 + 게이트 (PASS/BLOCKED)
- [ ] 상태 갱신

**Spec:** [SPEC-skills.md §2.1](./specs/SPEC-skills.md) — imbas:validate

### 4.2 imbas:split 구현
- [ ] SKILL.md 작성
- [ ] 전제조건 검증 (validate PASS)
- [ ] Epic 결정 로직
- [ ] imbas-planner 호출 프롬프트
- [ ] 3→1→2 검증 파이프라인
- [ ] 크기 검증 + 수평 분할 루프
- [ ] stories-manifest.json 생성
- [ ] 사용자 리뷰 + 승인 플로우

**Spec:** [SPEC-skills.md §2.2](./specs/SPEC-skills.md) — imbas:split

### 4.3 imbas:devplan 구현
- [ ] SKILL.md 작성
- [ ] 전제조건 검증 (split 완료 + 리뷰 승인)
- [ ] imbas-engineer 호출 프롬프트
- [ ] B→A 피드백 수집
- [ ] devplan-manifest.json 생성
- [ ] 사용자 리뷰 + 승인 플로우

**Spec:** [SPEC-skills.md §2.3](./specs/SPEC-skills.md) — imbas:devplan

---

## Phase 5: Execution & Utility Skills

### 5.1 imbas:manifest 구현
- [ ] SKILL.md 작성
- [ ] 매니페스트 로드 + pending 항목 식별
- [ ] dry-run 모드
- [ ] 배치 실행 (execution_order 순서)
  - [ ] createJiraIssue 호출
  - [ ] createIssueLink 호출
  - [ ] transitionJiraIssue 호출 (수평 분할 Done 처리)
- [ ] 항목별 즉시 상태 저장 (복구용)
- [ ] 결과 리포트

**Spec:** [SPEC-skills.md §4.1](./specs/SPEC-skills.md) — imbas:manifest
**Spec:** [SPEC-provider-jira.md §4](./specs/SPEC-provider-jira.md) — 도구별 실행 패턴

### 5.2 imbas:digest 구현
- [ ] SKILL.md 작성
- [ ] read-issue 호출 → 이슈 전체 컨텍스트 로드
- [ ] State Tracking (상태 변화 타임라인 구성)
- [ ] QA-Prompting (6개 질문 기반 핵심 추출)
- [ ] 3-Layer 압축본 생성 (executive / structured / excerpts)
- [ ] digest 마커 포맷 코멘트 생성
- [ ] --preview 모드 지원
- [ ] addCommentToJiraIssue 게시 + 사용자 확인
- [ ] manifest Done 전환 시 제안 트리거 로직

**Spec:** [SPEC-skills.md §6.3](./specs/SPEC-skills.md) — imbas:digest

### 5.3 imbas:fetch-media 구현
- [ ] SKILL.md 작성
- [ ] URL/경로 판별 + 다운로드
- [ ] 타입 판별 (이미지 vs 동영상/GIF)
- [ ] scene-sieve probe + extract 통합
- [ ] imbas-media 서브에이전트 호출
- [ ] 결과 캐싱 + 반환

**Spec:** [SPEC-skills.md §5.1](./specs/SPEC-skills.md) — imbas:fetch-media
**Spec:** [SPEC-media.md](./specs/SPEC-media.md) — 미디어 처리 상세

---

## Phase 6: 통합 테스트 & POC

### 6.1 End-to-End 시뮬레이션
- [ ] 테스트 기획 문서 준비 (소셜 로그인 예시)
- [ ] Phase 1 → 2 → 3 전체 플로우 실행
- [ ] 매니페스트 dry-run 확인
- [ ] Jira 실제 생성 테스트 (테스트 프로젝트)

### 6.2 에지 케이스 검증
- [ ] Phase 1 블로킹 → 수정 → 재검증
- [ ] Phase 2 수평 분할 반복
- [ ] Phase 3 Task 추출 (복수 Story 중복)
- [ ] manifest 중단 → 재실행 (멱등성)
- [ ] 미디어 포함 문서 처리

### 6.3 조정
- [ ] Phase 2 검증 파이프라인 튜닝 (3→1→2 임계값)
- [ ] Subtask 종료조건 수치 조정
- [ ] 에이전트 프롬프트 정제

---

## Dependency Graph

```
Phase 0 (기반)
  │
  ▼
Phase 1 (Infra Skills)
  │
  ▼
Phase 2 (Agent References)
  │
  ▼
Phase 3 (Agent Definitions)
  │
  ▼
Phase 4 (Core Skills)
  │
  ▼
Phase 5 (Exec & Util)
  │
  ▼
Phase 6 (Test & POC)
```

---

## Notes

- Phase 2 → 3은 순차 (Agent Definition이 References를 참조). 에이전트 단위 병렬만 가능 (예: analyst references 완료 → analyst agent 정의 가능, planner는 아직 진행 중)
- Phase 4는 Phase 1 + 3 완료 후 착수 (infra + agent 모두 필요)
- 각 Phase 완료 후 SPEC 문서 업데이트 (발견된 변경사항 반영)
