## Purpose

maencof 볼트 지식에 대한 읽기 전용 MCP 접근을 개발 컨텍스트에 제공하는 플러그인 소스 루트.

## Structure

- `__tests__/` 는 더블 언더스코어 이름 때문에 organ 으로 분류된다 — 자체 INTENT 를 두지 않고, 검증 파일이라 내부 모듈을 직접 import 해도 경계 위반이 아니다.

## Boundaries

### Always do

- 볼트 접근은 읽기 전용으로 유지한다
- 모든 하위 모듈을 index.ts를 통해 재수출한다

### Ask first

- 읽기 전용 5개 툴 외 새 MCP 툴 추가 시
- 레이어 필터링 교집합 로직 변경 시

### Never do

- 볼트 파일시스템에 쓰기
- maencof의 mutation 핸들러 호출
