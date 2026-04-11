# filid-review — Multi-Persona Code Review Governance

## Purpose

다중 페르소나 합의 기반 코드 리뷰 거버넌스 파이프라인. 구조 검사(Phase A), 분석 및 위원회 선출(Phase B), 기술 검증(Phase C1 메트릭 + C2 구조), 정치적 합의(Phase D) 단계로 구성. Phase D는 Claude Code 네이티브 팀 도구로 실제 에이전트를 스폰하여 위원회를 구성한다 (단, committee=1 이면 단일 Task).

## Structure

| 경로 | 역할 |
|------|------|
| `SKILL.md` | 5단계 워크플로우 메인 프롬프트 |
| `reference.md` | 분할된 참조 문서 인덱스 |
| `templates.md` | review-report / fix-requests / PR comment 출력 포맷 |
| `contracts.md` | committee→agent 매핑, opinion frontmatter, 서브에이전트 프롬프트 규칙, post-completion 검증 |
| `mcp-map.md` | MCP 도구 맵, 배치 파티셔닝, 체크포인트 resume, debt bias |
| `prompt-templates.md` | Phase A/B/C1/C2 서브에이전트 프롬프트 리터럴 템플릿 |
| `state-machine.md` | 의장 라운드 판정 규칙 (5라운드, SYNTHESIS/VETO/ABSTAIN) |
| `phases/phase-{a,b,c1,c2,d}-*.md` | 단계별 서브에이전트 지침 |

페르소나는 `packages/filid/agents/<persona-id>.md` 로 정의된다.

## Conventions

- Phase 병렬도: A+B, C1+C2, D 의장 직접; 위원회 TRIVIAL=1(adjudicator), LOW=2, MEDIUM=4, HIGH=6
- `--solo` 플래그로 adjudicator 강제 (6관점 통합 리뷰), >30 파일 diff 는 Phase A/C 배치 분할 또는 Team 승격
- 산출물: structure-check.md, session.md, verification-metrics.md, verification-structure.md, verification.md, rounds/round-N-<persona>.md, review-report.md, fix-requests.md

## Boundaries

### Always do

- 신규 specialist 페르소나 추가 시 세 곳 동시 수정: `src/types/review.ts` + `review-manage.ts` (LOW/MEDIUM/HIGH 배열) + `agents/<id>.md`
- 상태 전이 규칙 변경 시 `state-machine.md` 와 `phase-d-deliberation.md` Step D.3 동시 갱신
- Phase D 산출물 포맷 변경 시 `templates.md` + `contracts.md` Opinion Frontmatter Contract 동기화

### Ask first

- Phase 순서 변경 (체크포인트 로직에 영향)
- 위원회 정족수 규칙 변경 (`state-machine.md` 의 2/3 SYNTHESIS 임계값)
- Phase D 라운드 5회 한도 완화 (무한 루프 위험)

### Never do

- Phase D 의장이 MCP 측정 도구 직접 호출 (verification 인용만 허용)
- 심의 라운드 5회 한도 해제
- `personas/` 디렉토리 재생성 (페르소나는 `agents/` 로만 관리)
- 워커 재스폰 2회 한도 초과
- TRIVIAL tier에 specialist 페르소나 배치 (TRIVIAL은 adjudicator 전용)
