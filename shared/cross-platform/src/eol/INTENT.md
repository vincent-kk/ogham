## Purpose

외부 CLI stdout / 파일 텍스트의 라인 엔딩 정규화. CRLF → LF, BOM strip. 모든 spawn 결과는 본 모듈을 거쳐야 한다.

## Structure

| File                  | Role                              |
| --------------------- | --------------------------------- |
| `index.ts`            | barrel                            |
| `normalize-eol.ts`    | `normalizeEol(s)` 단일 함수       |

## Conventions

- 동작은 순수 함수 — `process.platform` 분기 없음, 입력만 변환.
- BOM 은 입력 선두 0xFEFF 만 제거 (중간 0xFEFF 는 보존).

## Boundaries

### Always do

- 모든 외부 CLI stdout 진입점에서 호출.

### Ask first

- LF → CRLF 역방향 변환 helper 추가.

### Never do

- 입력 텍스트에 \r 만 (CR-only) 존재하는 케이스 변환 — 정책 외.
- LF → CRLF 역방향 변환.

## Dependencies

- 외부: 없음 (Node 내장조차 사용 안 함).
