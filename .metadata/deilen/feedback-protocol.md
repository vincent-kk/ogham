# Feedback Protocol — Payload, Clipboard, Collection

브라우저 뷰어가 수집한 라인 코멘트 + 이미지(파일·클립보드)를 로컬 서버로 제출하고, MCP 가 이를 Claude 에 반환하는 규약.

## 전송 포맷 — multipart/form-data

텍스트 코멘트와 바이너리 이미지를 한 요청에 담기 위해 `multipart/form-data` 를 쓴다(base64 팽창 없음, 파일·클립보드 통일 처리).

```
POST /api/feedback?token=<…>        Content-Type: multipart/form-data
├─ field "payload"  (application/json)   ← 아래 FeedbackPayload
├─ part "img_<id>"  (image/png,  filename=clipboard-1.png)   <binary>
└─ part "img_<id>"  (image/jpeg, filename=shot.jpg)          <binary>
```

### FeedbackPayload (JSON field)

```jsonc
{
  "session_id": "rs_a1b2c3",
  "status": "in_progress" | "complete",
  "intent": "revise" | "discuss" | "dismiss",   // complete 제출의 처분(선택)
  "overall": [
    { "id": "o1", "text": "주제별 총평(선택, 다중)" }
  ],
  "comments": [
    {
      "id": "c1",
      "anchor": { "startLine": 12, "endLine": 14, "sourceText": "| col | …" },
      "text": "이 표 정렬이 깨졌어요",
      "imageIds": ["x1"]              // part `img_x1` 와 매칭 (접두 img_ 는 part 이름에만)
    }
  ]
}
```

- `Anchor.sourceText` 는 라인 범위 원문 발췌(Claude 가 위치를 정확히 특정하도록).
- `imageIds` 는 **bare id 배열**; id `x` 는 part `img_x` 와 1:1 (접두 `img_` 는 part 이름에만 붙는다 — `fd.append(`img\_${id}`, …)`).
- 라인 무관 전역 코멘트는 `anchor: null`.
- `intent` 은 **complete 제출의 처분**(선택): `revise`(코멘트 반영 후 문서 재표시), `discuss`(코멘트로 대화 이어감, 문서 자동 수정 안 함), `dismiss`(코멘트 없이 뷰어 닫기). in_progress auto-save 에는 무의미. `revise`/`discuss` 는 `config.last_intent` 로 영속된다(`dismiss` 는 미영속). 코멘트마다가 아니라 **제출 단위**의 성격이다.

## 코멘트 생애주기 (작성 · 편집 · 삭제 · 전체)

- **작성**: 라인 선택/거터 클릭 → `anchor` 보유 코멘트. `overall` 은 주제별 총평 노트(`{ id, text }` 다중, 선택) — 서로 다른 주제를 별개 메시지로 보존한다.
- **편집**: 사이드바에서 `text`/이미지 수정 → in-memory map 갱신.
- **삭제**: 항목 제거 → map 에서 제외 → 다음 auto-save payload `comments[]` 에 미포함(= 삭제 영속화). 종속 이미지도 함께 정리.
- **resolve(선택)**: `Comment.resolved?: boolean` — 표시만(수거 시 Claude 의 우선순위 판단에 활용).
- 모든 변경은 디바운스 auto-save(`status:"in_progress"`, **텍스트만** — 이미지는 `complete` 제출 시 일괄 업로드). 최종 `complete` 제출본이 수거 대상. in_progress 는 이미지 part 가 없어 `application/json` 으로도 보낼 수 있다.

## 클립보드 이미지 처리 (핵심)

파일 첨부와 클립보드 붙여넣기를 **동일한 Blob 경로**로 통일한다.

```js
// 붙여넣기
composer.addEventListener("paste", (e) => {
  for (const item of e.clipboardData.items)
    if (item.type.startsWith("image/")) attach(item.getAsFile()); // File(Blob)
});
// 파일 드롭/선택
input.addEventListener("change", (e) => [...e.target.files].forEach(attach));

// 제출
const fd = new FormData();
fd.append("payload", JSON.stringify(payload));
for (const { id, blob, name } of images) fd.append(`img_${id}`, blob, name);
fetch(`/api/feedback?token=${token}`, { method: "POST", body: fd });
```

- `FormData` + `fetch` 가 multipart 직렬화·경계 처리 자동.
- 첨부 직후 썸네일 프리뷰, 코멘트별 다중 이미지 허용.

## 서버 파싱·영속화

`handlePostFeedback` → `utils/parseMultipart.ts`(자체 multipart 파서 — `parseMultipartBody` 가 버퍼를 파싱, 외부 의존성 없음):

1. `payload` JSON 검증(Zod `FeedbackPayloadSchema`).
2. 각 `img_*` part 를 mime 화이트리스트(`image/png|jpeg|gif|webp`) + 크기 상한(`config.max_image_mb`, 기본 10MB) 검사 후 `runtime/sessions/<sid>/images/<id>.<ext>` 저장.
3. `feedbackStore` 가 `feedback.json` 갱신(코멘트 + 이미지 메타).
4. `status:"complete"` 이면 `sessionStore` 의 pendingResolver 호출 → 대기 중 `collect_feedback` 깨움. `intent` 이 `revise`/`discuss` 면 `config.last_intent` 도 best-effort 영속(실패해도 제출은 성공).
5. `in_progress`(auto-save) 는 **JSON 텍스트만** 영속화(이미지 Blob 미전송, `imageIds` 는 예약 참조), resolver 미발화. 이미지 Blob 은 최종 `complete` 멀티파트에 일괄 포함된다(**미제출 시 이미지 미보존** — M8 결정).

## 수거 — long-poll resolver

[spec.md](./spec.md) 의 메커니즘. `collect_feedback` ↔ `handlePostFeedback` 가 `sessionStore` resolver 로 랑데부:

- complete 버퍼 선재 시 즉시 반환.
- 아니면 resolver 등록 + `wait_seconds` 타이머(타임아웃 → `pending`).
- 동일 세션에 다중 collect 동시성은 없음(preview 는 직렬 호출). 방어적으로 마지막 resolver 만 유지.
- complete 가 content 로 반환되면(이미지 base64 인라인 직후) `feedback.json` 과 `images/` 를 정리(`clearCollectedFeedback`)한다. complete 제출 측은 깨우기 전에 `closeSession` 을 먼저 끝내므로, 이후 새로고침은 보존된 `viewer.md` 를 다시 렌더하고 heartbeat 404로 submit만 비활성화된다. 세션 디렉토리 전체 정리는 TTL prune 이 백스톱.

## MCP 반환 매핑

`collect_feedback` 결과 → MCP content 배열:

- **첫 줄(intent 지시)**: `revise`→「코멘트 반영 후 render_viewer 재호출로 재표시(리뷰 루프)」, `discuss`→「대화로 답변, 무단 재작성 금지」, `dismiss`→「뷰어 닫힘, 변경 없음」. 코멘트가 0개여도 이 지시로 Claude 가 다음 행동을 결정한다.
- **text 블록**: `overall` 노트들(`Overall notes (N):`) + 코멘트 목록을 `L12-14 「sourceText 발췌」 → 코멘트` 형식으로 정리(Claude 가 라인을 바로 찾도록).
- **image 블록**: 첨부 이미지마다 저장본을 base64 로 읽어 `{ type:"image", data, mimeType }`. → Claude 가 스크린샷을 실제로 본다.
- 이미지가 코멘트에 종속됨을 text 블록에서 `[img_x1]` 마커로 상호참조.

## 보안·한도

- 모든 요청 one-time token 검증(미검증 401).
- multipart 총량 상한(`config.max_payload_mb`, 기본 50MB), part 당 `max_image_mb`.
- mime 화이트리스트 외 part 거부.
- 저장 파일명은 서버 생성 ID 만 사용(클라이언트 filename 은 메타로만, 경로 traversal 차단).
