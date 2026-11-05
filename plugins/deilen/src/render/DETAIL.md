# render — DETAIL

## Requirements

- markdown 본문을 source-line 매핑된 base HTML 로 변환한다.
- GFM 표를 렌더한다.
- GFM task list(`- [x]`/`- [ ]`)를 체크박스 마커(`<span>`)로 렌더한다.
- 코드펜스/mermaid/수식은 **렌더하지 않고 표식만** 남긴다 (클라이언트 lazy-load 대상).
- 모든 블록 요소에 1-based 원본 라인 앵커를 부여한다.
- raw HTML(GitHub 스타일 `<details>`/`<summary>` 등)을 직접 렌더한다 (`html:true`).
  - raw HTML 유래 콘텐츠는 토큰 단계에서 **raw 프로파일** 로 정제한다: 내부 예약 속성(`class`, `data-source-line`/`-end`, `data-lang`, `data-display`, `data-src`) 불허 — 클라이언트 렌더러 위조·앵커 위조 차단. 콘텐츠 속성(`href`, `src`, `open`, `title` 등)만 허용.
  - `html_block` 은 정제 후 첫 여는 태그에 라인 앵커를 주입한다 (래퍼 div 는 `<details>` 열림/닫힘 블록 사이에 markdown 이 오는 GitHub 패턴의 DOM 구조를 깨므로 사용하지 않는다). 첫 토큰이 태그로 시작하지 않으면 앵커 없음(열화 허용).
  - `html_inline` 은 map 이 없어 앵커를 갖지 않는다 (부모 블록 앵커로 커버).
  - raw `<img src="file://…">` 는 imageRewrite 를 타지 않으며 스킴 차단으로 제거된다 — file:// 이미지는 markdown 문법(`![](file://…)`)만 지원.
- 출력 HTML 은 allowlist sanitize 로 정제한다. `html:true` 전환으로 sanitizer 가 **유일한 XSS 방어층** 이다:
  - allowlist 외 태그 제거(내부 텍스트 보존). 단 `script`/`style` 은 **내용째** 삭제.
  - HTML 주석·`<!DOCTYPE>`·`<![CDATA[`·`<? … ?>` 제거 (미종결 시 문자열 끝까지).
  - 승인 태그로 재구성되지 않은 잔여 `<` 는 전부 `&lt;` 로 이스케이프 — 미완성 태그(`<div onclick=x` + 무 `>`)가 브라우저에서 attribute-soup 로 재해석되는 경로 차단.
  - 속성값은 엔티티 **decode → 검증 → re-encode**. `href`/`src` 는 decode 후 제어 문자를 제거한 값으로 스킴 검사 — `java&#115;cript:`·`java&colon;script:` 류 난독화 우회 차단.
- `file://` 이미지 src 는 `/api/image/<sid>/<i>` 라우트로 치환해 뷰어가 로컬 이미지를 표시할 수 있게 한다(http/https/data/상대 스킴은 불변).
- GitHub HTML 패리티는 허용 태그 정책의 기준이다. 구식 tt·strike, srcset 파싱이 필요한 picture·source와 bdo는 제외한다.

## API Contracts

- 로컬 이미지 열거와 렌더 치환은 같은 문서 순서 인덱스를 공유한다. HTTP 이미지 서빙의 문서 멤버십 판정이 렌더 결과와 어긋나지 않게 하는 단일 소스다.
- raw와 rendered 정제 프로파일을 구분한다. 작성자가 넣은 HTML은 내부 예약 속성을 사용할 수 없고, 렌더러가 생성한 표식만 클라이언트가 신뢰할 수 있다.
- 라인 앵커와 렌더 표식의 형태는 렌더 규칙 및 검증 코드를 읽는다. 클라이언트와 공유하는 계약이므로 한쪽만 바꾸지 않는다.

## Acceptance Criteria

검증 코드가 수용 기준을 고정하므로 별도 acceptance group을 선언하지 않는다.

## Last Updated

raw HTML 정제·원본 라인 앵커·클라이언트 표식 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
