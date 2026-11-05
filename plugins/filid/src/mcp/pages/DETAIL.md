# pages contract

## Requirements

- MCP 서버가 로컬 HTTP로 서빙하는 브라우저 페이지의 프런트엔드 소스 루트다.
- 빌드는 인라인 단일 파일(`public/settings.html`)을 만든다. 외부 자산 참조를 남기지 않는다.

## API Contracts

페이지 소스는 런타임 import 대상이 아니라 빌드 입력이다. 외부 자산 없는 단일 HTML로 배포한다.

## Acceptance Criteria

### AC-pages-inline — 단일 파일 산출

- 빌드 결과가 외부 자산 참조 없는 단일 HTML이다.

## Last Updated

설정 페이지의 단일 파일 배포나 외부 자산 비참조 계약이 바뀔 때 갱신한다.
