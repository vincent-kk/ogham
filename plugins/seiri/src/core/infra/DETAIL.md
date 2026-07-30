# infra — Contract

## Requirements

- 프로젝트 로컬 설정의 읽기·쓰기만 담당한다. 지금 담는 것은 개입 강도 다이얼 하나뿐이다.
- 새 설정을 여기 두기 전에 "이것이 프로젝트 로컬 상태인가"를 먼저 답한다 — 규칙 배포 상태는 파일시스템이 소유하므로 여기 들어오지 않는다.

## API Contracts

- `configLoader` — 다이얼 2계층(`config.json` 기준선 + `runtime.json` 밸브)의 로드·기록·설명.

## Acceptance Criteria

### AC-infra-scope — 담는 것의 범위

- `infra/` 아래에 규칙 배포 상태나 세션 신호가 저장되지 않는다.

## Last Updated

2026-07-30 — 설정 계층의 범위를 문서화했다.
