# maencof-dailynote-read

## Purpose

일일 노트 읽기 도구. 자연어 프롬프트("오늘 활동 보여줘" 등)에서 직접 호출되므로
LLM이 출력 렌더링까지 스스로 수행한다.

## Boundaries

### Always do

- 입력 Zod 스키마 검증
- core/ 모듈에 로직 위임
- 출력을 날짜별 테이블로 렌더링 (Time / Category / Activity / Path 컬럼)
- 빈 결과는 "No activities recorded" 메시지로 처리

### Ask first

- 입출력 스키마 변경
- 렌더링 포맷 컬럼 순서/라벨 변경

### Never do

- 파일 I/O 직접 수행 (core/ 위임)
- 슬래시 스킬 래퍼 재도입 (v0.3.1에서 maencof-dailynote 스킬 제거됨)

## Output Contract

- 날짜별 `notes[]` 반환. LLM은 `## Dailynote — {date}` 헤더 + 테이블로 렌더.
- 테이블 컬럼: `Time` / `Category` / `Activity` / `Path`.
- 푸터: `> Total: N activities recorded.`
- 카테고리 enum: `document` / `search` / `index` / `config` / `session` / `diagnostic`.
- `total_entries === 0`: "No activities recorded for the given date."
- 렌더 상세는 DETAIL.md 참조.
