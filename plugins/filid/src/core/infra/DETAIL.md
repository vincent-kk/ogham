# infra contract

## Requirements

- config, cache와 content-addressed ephemeral artifact의 host I/O를 소유한다.
- config·세션 cache·ephemeral artifact의 I/O는 이 계층에 모은다. 제출 facts의 저장 I/O는 facts가 소유한다. facts의 hash 결속·CAS·손상 복구 계약을 임시 artifact 수명과 섞지 않기 위해서다.
- config 읽기는 v1/v2를 메모리에서만 변환한다. 초기화는 key 손실 없이 strict v3로 검증되는 변환만 기록한다. 읽기 자체가 사용자 설정을 바꾸거나 초기화가 버린 정책을 확정하지 않게 하기 위해서다.
- artifact는 임시 자료다. 장기 원장으로 취급하지 않는다.

## API Contracts

공개 함수는 진입점에서 확인한다. config 저장, 세션 캐시와 ephemeral artifact는 수명이 다른 저장 경계로 유지한다.

## Acceptance Criteria

### AC-infra-config-v2 — strict schema

- 알 수 없는 key는 무시되지 않고 거부된다.
- v1/v2 config의 읽기는 원본 byte를 보존한다. 초기화는 버리는 key 없이 v3 검증을 통과한 변환만 기록하고, 그 밖의 기존 파일은 보존한다.

### AC-infra-artifact — 임시 저장

- 예산 초과 payload가 atomic write되고 경로·바이트·SHA-256이 반환된다.

## Last Updated

config migration의 쓰기 경계, 세션 cache와 임시 artifact의 수명 계약이 바뀔 때 갱신한다.
