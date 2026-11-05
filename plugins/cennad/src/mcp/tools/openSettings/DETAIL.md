# openSettings — Contract

## Requirements

- 설정 화면을 열거나 재사용하는 것만으로 user 설정 파일을 정리하거나 다시 쓰지 않는다. 설정 변경은 명시적인 저장 선택을 따른다.

- `127.0.0.1` 전용 HTTP 서버를 띄우고 one-time token 으로 보호된 폼을 브라우저에 노출한다.
- 5분 idle 또는 사용자의 "Save & Close" 액션에서 자동 종료한다.
- 설정 HTML 은 런타임에 `public/settings.html` 에서 읽는다(번들 미포함).

## API Contracts

입출력 이름과 형태는 진입점과 검증 코드를 읽는다. 이 문서의 요구사항은 그 표면을 바꿀 때 보존할 정책을 정한다.

## Acceptance Criteria

검증 코드가 수용 기준을 고정하므로 별도 acceptance group을 선언하지 않는다.

## Last Updated

설정 열기의 읽기 전용 정책·서버 재사용 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
