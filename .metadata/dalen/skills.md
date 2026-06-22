# Skills

스킬 2개. 플러그인 prefix 없는 동사형 이름(가족 컨벤션). SKILL.md 본문은 영어(셸 스킬 파일 규칙). 아래는 설계 의도.

## `present`

Claude 보고서를 페이지로 띄우고 라인 피드백을 자동 수거하는 메인 흐름.

트리거(예): "present this", "이 보고서 페이지로 보여줘", "브라우저로 검토하게 해줘".

절차:

1. **콘텐츠 확정** — 직전 보고서 본문(대화 내) 또는 사용자가 가리키는 파일 경로. 본문이면 `content`, 파일이면 `path`.
2. **렌더** — `render_report({ content | path, title? })` 호출 → `{ session_id, url }` 수신. 사용자에게 URL 안내(자동 오픈됨) + "라인 선택해 코멘트·이미지 남기고 Submit" 안내.
3. **자동 수거 루프** — `collect_feedback({ session_id, wait_seconds })` 반복:
   - `status:"complete"` → 루프 종료, 피드백 확보.
   - `status:"pending"` → 즉시 재호출(자동). `present` 가 M 라운드(기본 5) 초과하면 "검토 끝나면 알려주세요"로 **수동 폴백** 후 대기.
4. **반영** — text 코멘트(라인 앵커별) + image 블록(스크린샷)을 근거로 보고서 수정. 라인 앵커로 위치를 특정해 surgical 수정.
5. **정리(선택)** — `close_report({ session_id })`.

원칙: 무한 블로킹 금지. 한 번의 `collect_feedback` 는 bounded(`wait_seconds`)이며, 자동성은 재호출 루프로 달성.

## `setup`

설정 UI 열기.

트리거(예): "dalen 설정", "open dalen settings", "테마 바꿔줘".

절차: `open_settings()` 호출 → 반환 URL 안내. 사용자가 테마/자동오픈/타임아웃/포트/렌더러 토글 등을 편집·저장.

## 토큰 효율 (present 운용 지침)

- **대용량 보고서는 `path` 우선**: `content` 인라인은 보고서를 도구 입력으로 복제(대화에 1회 더 등장). 큰 문서는 파일 저장 후 `path` 전달 → 토큰 거의 0.
- **채팅에 본문 재출력 금지**: present 할 보고서를 길게 출력한 뒤 또 렌더하면 2배 소비. 생성→바로 `render_report`(또는 파일) 경로로.
- **poll 라운드 최소화**: `wait_seconds` 를 넉넉히 잡아 1~2라운드 수렴(pending 응답은 수십 토큰, 프롬프트 캐시로 미미). **제약**: `wait_seconds` < MCP 클라이언트 tool 타임아웃(`MCP_TIMEOUT`) — Claude Code 기본값 확인 후 조정. 타임아웃을 키우면 라운드↓.
- **이미지 비용**: 첨부 스크린샷은 vision 토큰(장당 수백~1.5k)으로 유입 — 본질적·유익하나 장수는 사용자 판단. 대형은 클라이언트 다운스케일 옵션 고려(후속).
- 결론: **본문 중복만 피하면(=path 우선) 낭비 아님.** 렌더는 1회성, 수거는 소형 텍스트+필요한 이미지, 폴링은 미미.

## plan 프레젠테이션

plan 도 markdown 이므로 `render_report` 로 그대로 띄운다(별도 경로 불필요).

- Plan 모드 산출(ExitPlanMode 의 plan 본문)이나 저장된 plan 문서를 `content`/`path` 로 전달.
- **plan 모드 권한 주의**: plan 모드는 승인 전 도구 사용을 제한한다. `render_report` 는 저장소를 수정하지 않지만(페이지 서빙만) 클라이언트 정책에 막힐 수 있으므로, 보통 **plan 확정/exit 후** present 하거나 plan 을 파일로 두고 present.
- 역할 분리: dalen 은 "표시+피드백"만. plan/기획 문서의 분해·이슈화는 imbas 영역([../imbas/BLUEPRINT.md](../imbas/BLUEPRINT.md)) — read-only plan 취급 관례 참조.

## 비채택

- 렌더 전용·수거 전용 스킬 분리(둘은 한 흐름이라 `present` 로 통합).
- Hook 기반 자동 `present` 제안(v1 — 명시 호출만; 추후 검토).
