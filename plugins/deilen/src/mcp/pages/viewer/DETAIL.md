# viewer — Contract

## Requirements

- 뷰어는 서버가 만든 base HTML 을 받아 표시하고, 무거운 렌더러(highlight·mermaid·katex)는 표식을 만났을 때만 `public/assets/` 에서 동적 import 한다.
- 코멘트 앵커는 서버가 넣은 `data-source-line`/`data-source-end` 를 그대로 쓴다 — 클라이언트가 라인 번호를 다시 추정하지 않는다.
- 세션이 닫혔거나 이미 수거된 뒤에도 페이지는 읽을 수 있어야 한다. 새로고침 시 `/api/ping` 결과로 제출만 비활성화한다.
- 미전송 코멘트는 `localStorage`(`deilen:draft:<session_id>`) 에 변경마다 저장되고, 페이지 로드 시 localStorage → 서버 `draft` 순으로 복원된다. 첨부 이미지는 dataURL 로 직렬화되며 직렬화 총량이 상한(3.5M chars)을 넘거나 저장이 거부되면 텍스트만 저장하고 `imagesDropped` 를 표시한다. 저장은 세대 번호로 보호되어 제출·dismiss 이후 착지하는 쓰기는 버려진다. 제출 성공·dismiss 시 삭제, `session_ttl_hours` 를 넘긴 키는 로드 시 정리된다. 저장된 카드가 있거나 열린 composer 에 텍스트·첨부가 있으면 `beforeunload` 가 이탈을 확인한다.
- heartbeat 는 30초 주기다. `/api/ping` 404 는 `ended` 로, 401(토큰 불일치 — 페이지의 토큰은 바뀌지 않으므로 복구 불가)은 `offline` 으로 즉시 최종 확정되어 루프가 멈춘다. 네트워크 오류나 그 밖의 비-2xx 는 실패로 세어 연속 3회 뒤에만 `offline` 으로 판정하고, 다음 성공 시 `alive` 로 복귀한다. 상태는 전이 시에만 알리고, 탭이 다시 보이면 즉시 ping 한다.
- 문서 본문의 링크는 fragment(`#`) 링크를 제외하고 모두 `target="_blank" rel="noopener noreferrer"` 로 새 탭에서 열린다 — 뷰어 페이지를 떠나지 않는다. 마운트 시점에 존재하는 링크가 대상이며, 이후 렌더러(mermaid) 가 만든 링크는 제외된다.
- 제출 의도(revise/discuss)는 마지막 사용값을 기본으로 노출한다.

## API Contracts

- 서버가 만든 라인 앵커와 세션 상태를 소비한다. 클라이언트가 번호나 세션 수명을 재추정하지 않는다.
- 무거운 렌더러는 독립 asset chunk로 유지하고 실패 시 읽을 수 있는 원문 fallback을 남긴다. 라우트와 state 필드는 구현과 테스트를 읽는다.

## Acceptance Criteria

### AC-viewer-lazy-render — 지연 렌더

- 코드·mermaid·수식 표식이 있을 때만 해당 렌더러 자산을 내려받는다.

### AC-viewer-anchor-fidelity — 앵커 충실성

- 코멘트가 서버가 부여한 원본 라인 범위에 정확히 매핑된다.
- 표의 한 행에 코멘트를 달면 그 행의 셀들이 하이라이트된다.

### AC-viewer-post-submit-state — 제출 후 상태

- 수거·종료 후에도 페이지가 읽히고, 새로고침하면 제출이 비활성화된다.

## Last Updated

초안 복원·heartbeat 판정·원본 라인 앵커 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
