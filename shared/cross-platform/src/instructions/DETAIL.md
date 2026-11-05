# instructions — Contract

## Requirements

- 순수 함수만 둔다. `node:fs` 를 쓰지 않고 파일 I/O 는 소비처가 소유한다(filid=원자적 쓰기, maencof=`.bak` 백업). Node 내장조차 의존하지 않는다.
- `process.env` 를 읽지 않는다. 훅에는 `OGHAM_HOST` 가 없으므로 호스트 분기 대신 채널 합집합(`INSTRUCTIONS_FILES`) 판독을 쓴다. env 판독이 들어오면 훅 안전성이 깨진다.
- 구간은 부분 문자열 검색으로 찾는다 — 마커가 다르면 여러 플러그인·여러 규칙 문서가 한 파일에 공존한다.
- `mergeSection` 은 재실행 안전이다. 같은 본문을 두 번 병합해도 누적되지 않는다.
- `removeSection` 은 소유 마커 span 밖 바이트를 공백까지 보존한다.
- 파일 경로를 인자로 받는 API 를 추가하지 않는다.

## API Contracts

- id를 생략한 marker 형식은 배포된 maencof 지침을 계속 읽기 위한 호환 계약이다.
- 외부 소비자는 모든 공개 심볼을 `@ogham/cross-platform` 패키지 루트에서
  가져온다. 하위 fractal은 소유한 concrete operation을 직접 조립한다.

## Acceptance Criteria

### AC-pure-no-io — 순수·무I/O

- 이 fractal 의 어떤 파일도 `node:fs` 나 `process.env` 를 읽지 않는다.

### AC-root-output-isolation — 루트 공개 주소와 출력 격리

- 외부 import 주소는 `@ogham/cross-platform` 하나다.
- hook 번들은 `sideEffects: false` tree-shaking 뒤 emitted byte cap과
  `FORBIDDEN_PATTERNS` 출력 검사를 통과한다.

## Last Updated

지침 채널·소유 marker 또는 구간 밖 바이트 보존 정책의 범위가 바뀔 때 갱신한다.
