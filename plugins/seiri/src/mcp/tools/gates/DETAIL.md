# DETAIL — gates

## Requirements

- `status` 는 작업 하나를 지정하면 게이트 상세를 포함하고, 지정하지 않으면 읽을 수 있는 모든 작업을 이름순 요약한다.
- 전체 `all_met` 은 반환된 모든 작업 원장의 `all_met` 이 참일 때만 참이다.
- `abandon` 은 유효한 작업·게이트와 비어 있지 않은 사유를 기존 원장에 기록하고 갱신 상태를 반환한다.
- `record` 는 CHECK 없는 수동 게이트와 비어 있지 않은 증거만 기존 원장에 기록한다.
- 작업 이름과 게이트 ID를 검증한 뒤 core 계약에 위임하며, 프로세스 실행·원장 생성·세션 식별자 처리를 하지 않는다.
- 실행 가능한 게이트의 증명은 EXPECT 매치다. `status.unmet_gates`는 CHECK가 있으나 EXPECT가 없을 때 `needs_expect: true`를 덧붙인다.

## API Contracts

실행 가능한 CHECK는 관측 출력의 EXPECT 일치로만 증명한다. 명시적 record는 CHECK 없는 수동 게이트에 한정하여 모델이 실행 증거를 대신 작성하지 못하게 한다.

## Acceptance Criteria

### AC-gates-no-execution — 명령을 실행하지 않는다

- 어떤 action도 프로세스를 띄우지 않으며, CHECK가 있는 게이트의 `record` 를 거부한다.

## Last Updated

status 요약·수동 record·abandon 액션과 core 위임 경계의 계약이 바뀔 때 갱신한다.
