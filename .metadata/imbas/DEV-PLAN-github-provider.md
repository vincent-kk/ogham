# DEV-PLAN: GitHub Provider 추가 개발 계획서

> Status: Draft (2026-04-04)
> Type: 임시 개발 문서
> Scope: GitHub Issues provider 추가를 위한 변경사항 집약

---

## 1. 변경 개요

기존 Jira 전용 설계를 **Jira + GitHub Issues 듀얼 프로바이더**로 확장.
핵심 파이프라인(validate → split → devplan → manifest)은 **변경 없음**.
변경은 **I/O 경계** (이슈 트래커와의 통신 레이어)에 집중.

---

## 2. 스펙 문서 변경 요약

### 2.1 신규 문서 (완료)

| 문서 | 상태 | 내용 |
|------|------|------|
| `SPEC-provider.md` | ✅ 작성 완료 | 추상 인터페이스, 통일 타입, 스킬 분기 패턴 |
| `SPEC-provider-github.md` | ✅ 작성 완료 | GitHub 매핑, gh CLI 패턴, 라벨/마일스톤, body meta block |
| `SPEC-provider-jira.md` | ✅ 작성 완료 | 기존 Atlassian tools 재구성 (SPEC-atlassian-tools.md 대체) |

### 2.2 수정 문서 (완료)

| 문서 | 상태 | 변경 내용 |
|------|------|----------|
| `BLUEPRINT.md` | ✅ 수정 완료 | Provider 계층 추가, 이슈 아키텍처 매핑 테이블, 언어 설정 리네임 |
| `SPEC-state.md` | ✅ 수정 완료 | config.json provider+github 섹션, 필드 리네임 전역 적용 |
| `PLAN.md` | ✅ 수정 완료 | Phase 0.3 Provider 기반 추가 |

### 2.3 향후 수정 필요 (구현 시)

| 문서 | 변경 내용 | 시점 |
|------|----------|------|
| `SPEC-skills.md` | 각 스킬의 provider 분기 로직 추가 | Phase 1, 4, 5 구현 시 |
| `SPEC-agents.md` | 에이전트 도구 목록에 Bash (gh CLI) 추가 | Phase 3 구현 시 |
| `SPEC-tools.md` | imbas MCP 도구는 변경 없음. 필요 시 참조 갱신 | Phase 0 구현 시 |

### 2.4 Deprecated

| 문서 | 대체 |
|------|------|
| `SPEC-atlassian-tools.md` | `SPEC-provider-jira.md`로 대체. 구현 완료 시 삭제 |

---

## 3. 필드 리네임 전역 목록

구현 시 코드/스키마에서 일괄 적용해야 하는 리네임:

| 기존 필드 | 신규 필드 | 위치 |
|----------|----------|------|
| `project_key` | `project_ref` | config.json, state.json, manifest, 스킬 인자 |
| `epic_key` | `epic_ref` | state.json, manifest |
| `jira_key` | `issue_ref` | manifest (stories, tasks, subtasks) |
| `story_key` | `story_ref` | devplan-manifest.json (story_subtasks[].story_ref) |
| `target_key` | `target_ref` | devplan-manifest.json (feedback_comments[].target_ref) |
| `jira_content` | `issue_content` | config.json (language 섹션) |

**호환성:** v1.0 config.json을 읽을 때 `project_key` → `project_ref` 자동 마이그레이션 권장.

---

## 4. 구현 작업 목록

### Phase 0: 기반 (Provider Abstraction)

| # | 작업 | 산출물 | 의존성 |
|---|------|--------|--------|
| 0.3.1 | Provider 타입/인터페이스 정의 | `src/providers/types.ts` | — |
| 0.3.2 | Config 스키마 Zod 업데이트 | `src/core/config-manager.ts` | 0.3.1 |
| 0.3.3 | 필드 리네임 적용 (state, manifest Zod) | `src/core/state-manager.ts`, `manifest-parser.ts` | 0.3.1 |
| 0.3.4 | 프로젝트 디렉토리명 해석 (`owner--repo`) | `src/core/paths.ts` | — |
| 0.3.5 | Config v1.0 → v1.1 마이그레이션 헬퍼 | `src/core/config-migrate.ts` | 0.3.2 |

### Phase 1: GitHub Setup

| # | 작업 | 산출물 | 의존성 |
|---|------|--------|--------|
| 1.1g | setup 스킬: GitHub init 분기 | SKILL.md 수정 | 0.3.* |
| 1.2g | gh CLI auth 검증 로직 | — (스킬 프롬프트 내) | — |
| 1.3g | Label 자동 생성 (type:*, status:*, imbas) | — (gh label create --force) | 1.1g |
| 1.4g | GitHub 메타데이터 캐시 수집 | cache/ 파일들 | 1.1g |
| 1.5g | Milestone 생성 로직 | — (gh api) | 1.1g |

### Phase 4: Core Skills — Provider 분기

| # | 작업 | 산출물 | 의존성 |
|---|------|--------|--------|
| 4.1g | validate: 소스 해석 분기 (Confluence URL vs 로컬 only) | SKILL.md 수정 | Phase 3 |
| 4.2g | split: Epic 결정 분기 (Jira Epic vs Milestone+Tracking Issue) | SKILL.md 수정 | Phase 3 |
| 4.3g | devplan: Story 조회 분기 | SKILL.md 수정 | Phase 3 |

### Phase 5: Execution — Provider 분기

| # | 작업 | 산출물 | 의존성 |
|---|------|--------|--------|
| 5.1g | manifest stories: GitHub 실행 경로 | SKILL.md 수정 | 4.* |
| | — Milestone 생성 | | |
| | — Tracking Issue (Epic) 생성 | | |
| | — Story Issue 생성 + label + milestone | | |
| | — Epic body task list 갱신 | | |
| | — Body meta block 삽입 (link 정보) | | |
| 5.2g | manifest devplan: GitHub 실행 경로 | SKILL.md 수정 | 5.1g |
| | — Task/Subtask Issue 생성 | | |
| | — Parent body task list 갱신 | | |
| | — Body meta block 갱신 (blocks/is_blocked_by) | | |
| | — Feedback comment 게시 | | |
| 5.3g | digest: GitHub comment 분기 | SKILL.md 수정 | — |
| 5.4g | read-issue: GitHub 이슈 파싱 분기 | SKILL.md 수정 | — |

### Phase 6: References

| # | 작업 | 산출물 | 의존성 |
|---|------|--------|--------|
| 6.1g | `references/gh-cli-patterns.md` 작성 | reference 문서 | — |
| 6.2g | Agent reference에 GitHub 검색 패턴 추가 | reference 수정 | — |

### Phase 7: 통합 테스트

| # | 작업 | 의존성 |
|---|------|--------|
| 7.1g | GitHub provider E2E: setup → validate → split → manifest stories | 5.1g |
| 7.2g | GitHub provider E2E: devplan → manifest devplan | 5.2g |
| 7.3g | Label swap 상태 전이 검증 | 5.1g |
| 7.4g | Body meta block 파싱/갱신 검증 | 5.2g |
| 7.5g | Milestone 연동 검증 | 5.1g |
| 7.6g | 중단 → 재실행 멱등성 (issue_ref 기반) | 5.2g |

---

## 5. GitHub Provider 핵심 구현 사항

### 5.1 Body Meta Block 파서

**위치:** `src/providers/github/meta-block.ts` (또는 스킬 프롬프트에 인라인)

```
Input:  issue body (string)
Output: { type, parent, blocks[], is_blocked_by[], split_from, split_into[], relates_to[] }

Parse:  regex /<!-- imbas:meta\n([\s\S]*?)-->/
        YAML-like key-value pairs within block
        Issue refs: split by comma, trim, validate #N format
```

**Update 로직:**
1. 기존 meta block 존재 → regex replace
2. 미존재 → body 끝에 `\n\n---\n<!-- imbas:meta\n...\n-->` 추가
3. meta block 위의 사용자 콘텐츠는 절대 수정하지 않음

### 5.2 Task List 관리자

**위치:** 스킬 프롬프트 로직 (별도 모듈 불필요)

Epic/Story body의 task list 섹션을 관리:
1. 섹션 헤더 감지: `## Stories`, `## Tasks`, `## Subtasks`
2. 기존 항목 파싱: `- [ ] #N 제목` 또는 `- [x] #N 제목`
3. 신규 항목 추가: 해당 섹션 끝에 `- [ ] #N 제목`
4. 중복 방지: `#N` 이미 존재하면 스킵

### 5.3 Label Swap 상태 전이

```bash
# 상태 전이 일반 패턴
gh issue edit <num> --repo <repo> \
  --remove-label "<current_status_label>" \
  --add-label "<target_status_label>"

# done 전이 시 추가로 issue close
if target == "done":
  gh issue close <num> --repo <repo> --reason completed
```

**참고:** GitHub에는 전이 제약이 없으므로 `get_transitions` 구현은 항상 전체 상태 목록 반환.

### 5.4 Milestone 관리

```bash
# 생성 (idempotent — 동명 존재 시 기존 반환)
MILESTONE=$(gh api repos/{owner}/{repo}/milestones \
  --jq '.[] | select(.title=="Epic Name") | .number')
if [ -z "$MILESTONE" ]; then
  gh api repos/{owner}/{repo}/milestones \
    -f title="Epic Name" -f description="..." -f state="open"
fi

# 이슈에 할당
gh issue edit <num> --repo <repo> --milestone "Epic Name"
```

### 5.5 gh CLI JSON 출력 파싱

모든 gh CLI 호출은 `--json` 플래그로 구조화된 출력 사용:

```bash
# 이슈 상세
gh issue view 42 --repo owner/repo --json number,title,body,labels,state,milestone,comments

# 이슈 생성 후 번호 추출
URL=$(gh issue create --repo owner/repo --title "..." --body "..." --label "...")
# URL format: https://github.com/owner/repo/issues/42
# Extract: echo "$URL" | grep -oP '\d+$'
```

---

## 6. 위험 요소 & 대응

| 위험 | 영향 | 대응 |
|------|------|------|
| **gh CLI 버전 호환성** | `--json` 플래그가 gh 2.0+ 필요 | setup에서 `gh --version` 체크, 최소 버전 명시 |
| **Body 편집 경합** | 사용자가 body를 동시에 편집하면 meta block 손실 가능 | meta block은 body 끝에 배치 + 편집 전 항상 최신 body 읽기 |
| **Label 이름 충돌** | 기존 repo에 동명 label이 다른 용도로 존재 | `--force` + setup 시 경고 표시, config에서 prefix 커스터마이징 가능 |
| **GitHub API rate limit** | 대량 이슈 생성 시 제한 | gh CLI 내장 retry + 배치 간 적절한 간격 |
| **Milestone 이름 유일성** | GitHub는 milestone 이름 unique 보장 안 함 (API 상) | 생성 전 `--jq` 필터로 중복 확인 |
| **Task list 체크박스 동기화** | GitHub가 child issue close 시 자동 체크하지만, 순서 재배열 불가 | 생성 순서로 관리, 사용자 수동 재배열 허용 |

---

## 7. 의존성 그래프

```
Phase 0.3 (Provider 기반)
  │
  ├──→ Phase 1.1g~1.5g (GitHub Setup)
  │         │
  │         ▼
  │    Phase 4.1g~4.3g (Core Skill 분기)
  │         │
  │         ▼
  │    Phase 5.1g~5.4g (Execution 분기)
  │         │
  │         ▼
  │    Phase 7.1g~7.6g (통합 테스트)
  │
  └──→ Phase 6.1g~6.2g (References — 병렬 가능)
```

- Phase 0.3은 기존 Phase 0.1~0.2와 병렬 가능
- Phase 6 references는 아무 시점에나 작성 가능
- Phase 1~5의 기존 Jira 경로 구현과 GitHub 경로 구현은 병렬 가능

---

## 8. 완료 기준

- [ ] `config.provider: "github"` 설정 시 setup → validate → split → manifest stories E2E 동작
- [ ] `config.provider: "github"` 설정 시 devplan → manifest devplan E2E 동작
- [ ] Label 자동 생성 + 상태 전이 (label swap + close) 정상 동작
- [ ] Milestone 생성 + 이슈 할당 정상 동작
- [ ] Body meta block 파싱/갱신 정상 동작 (사용자 콘텐츠 보존)
- [ ] Task list 자동 관리 (Epic/Story body) 정상 동작
- [ ] 중단 → 재실행 멱등성 (`issue_ref` 기반 스킵) 정상 동작
- [ ] 기존 Jira provider 기능 regression 없음
