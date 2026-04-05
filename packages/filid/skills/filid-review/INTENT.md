# filid-review — Multi-Persona Code Review Governance

## Purpose

다중 페르소나 합의 기반 코드 리뷰 거버넌스 파이프라인. 구조 검사(Phase A), 분석 및 위원회 선출(Phase B), 기술 검증(Phase C), 정치적 합의(Phase D) 4단계로 구성된다.

## Structure

| 경로 | 역할 |
|------|------|
| `SKILL.md` | 리뷰 워크플로우 메인 프롬프트 (5단계) |
| `reference.md` | 출력 템플릿, MCP 도구 맵, 체크포인트 참조 |
| `state-machine.md` | Phase D 심의 상태 전이 규칙 (최대 5라운드) |
| `phases/` | Phase A~C 서브에이전트 프롬프트 |
| `personas/` | 위원회 페르소나 정의 (6종) |

## Conventions

- Phase A+B 병렬, Phase C 순차, Phase D 의장 직접 실행
- 위원회: 복잡도 기반 2~6명 자동 선출, 적대적 쌍 보장
- 산출물: structure-check.md, session.md, verification.md, review-report.md, fix-requests.md

## Boundaries

### Always do

- 새 페르소나 추가 시 `personas/` 파일 + elect-committee 로직 수정
- 상태 전이 규칙 변경 시 `state-machine.md` 업데이트

### Ask first

- Phase 순서 변경 (체크포인트 로직에 영향)
- 위원회 정족수 규칙 변경 (합의 기준 변동)

### Never do

- Phase D에서 MCP 도구 직접 호출 (읽기 전용)
- 심의 라운드 5회 제한 해제
