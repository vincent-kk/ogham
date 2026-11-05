# providers/github — DETAIL

## Requirements

GitHub 이슈 본문의 Links 문법을 해석한다. 알 수 없는 링크 타입은 경고 후 건너뛰고 부분 결과를 반환하여 전방 호환성을 유지한다. 외부 I/O나 검증 라이브러리를 도입하지 않는 문자열 파서 경계를 지킨다.

## API Contracts

알 수 없는 링크 타입은 경고하고 건너뛰어 전방 호환성을 유지한다. 오류 하나로 나머지 파싱 결과를 버리지 않으며, 문법과 구체 입출력 사례는 파서·테스트에서 확인한다.

## Acceptance Criteria

### AC-github-links-forward-compat — 전방 호환

- 알 수 없는 `linkType` 은 `console.warn` 후 건너뛴다.
- 알 수 없는 항목이 있어도 `parseLinks` 가 throw 하지 않고 나머지 항목을 반환한다.

### AC-github-pure — 순수성

- `github/**` 가 `node:fs` · `node:child_process` · 네트워크 클라이언트를 import 하지 않는다.
- 같은 입력에 대해 같은 출력을 반환한다.

## Last Updated

Links 문법·전방 호환·부분 결과 계약의 내용과 근거가 바뀔 때 갱신한다.
