## Purpose

프로젝트와 사용자 생성자가 엔진을 만들기 전에 공통 artifact 식별자를 한 번
검증한다.

## Structure

| File                          | Role                            |
| ----------------------------- | ------------------------------- |
| `index.ts`                    | 내부 명시적 배럴                |
| `validation.ts`               | 소유자 namespace 유효성 검증    |
| `helpers/`                    | ASCII 제어문자 범위 판별 organ   |

## Conventions

- 소유자는 소문자 영숫자 kebab case다.
- 제어문자는 정규식 대신 `charCodeAt`으로 판별한다.
- 실패 메시지는 어떤 입력 경계를 위반했는지 명시한다.

## Boundaries

### Always do

- 식별자를 경로나 마커에 사용하기 전에 검증한다.
- project/user 생성자가 같은 검증 함수를 재사용한다.

### Ask first

- 허용 문자나 정규화 정책 변경.

### Never do

- 유효하지 않은 값을 자동 정규화하거나 잘라서 수용.
- 경로 또는 파일 시스템 작업 수행.

## Dependencies

- 없음.
