# lcom4 -- 클래스 응집도 계산 (LCOM4)

## Purpose

클래스 내 메서드가 공유 필드를 통해 연결된 정도를 측정해 응집도 저하(Lack of Cohesion of Methods)를 연결 컴포넌트 수로 반환한다. FCA 규칙 `LCOM4 ≥ 2 → 분리 권장`의 계산 엔진.

## Structure

- `lcom4.ts` — `calculateLCOM4` (public), `extractClassInfo` (public, 메서드·필드 추출), `findThisAccesses` (internal)

## Conventions

- 그래프 모델: nodes = 메서드, edges = 두 메서드가 동일한 필드를 적어도 하나 공유
- 공유 판정: `this.<prop>` 접근만 인정 (`member_expression`의 `this` + `property_identifier` 쌍)
- LCOM4 값 = BFS로 세어낸 undirected connected components 수
  - 0 = 메서드 없음 (클래스 없음이거나 비어 있음)
  - 1 = 단일 응집체 (good)
  - ≥ 2 = 분리 권장 (fragmented)
- 필드는 `public_field_definition` 기준 (getter/setter·generator는 추후 확장 지점)
- 메서드는 `method_definition` + `statement_block` body 존재 조건

## Boundaries

### Always do

- 응집도 판정이 `this.<prop>`에만 의존한다는 제한을 주석으로 유지
- `ClassInfo`/`MethodInfo` 타입 확장 시 `types/ast.ts`와 동기화

### Ask first

- 공유 기준을 "필드 공유"에서 "메서드 간 직접 호출"까지 확장
- 상속된 메서드/필드 포함 여부 변경

### Never do

- 파일 I/O 수행 (입력은 source string + className)
- 클래스를 찾지 못했을 때 예외 throw (null 반환 유지)

## Dependencies

- `@ast-grep/napi` (`SgNode`)
- `../parser/` (`parseSource`, `walk`)
- `../../types/ast.js` (`ClassInfo`, `MethodInfo`)
- `../../types/metrics.js` (`LCOM4Result`)
