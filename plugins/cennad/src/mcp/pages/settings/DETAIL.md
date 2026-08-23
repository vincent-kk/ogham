# settings — Contract

## Requirements

- provider 활성화·비율, tier 별 모델·effort, preamble, recency factor 를 한 폼에서 정한다.
- 모델·effort 선택지는 `agyModels`·`codexModels` 카탈로그에서 온다. **codex 는 모델이 광고하지 않은 effort 를 거부하므로 둘을 짝으로 노출한다.**
- 모든 요청에 `?token=` 을 부착하고 POST 본문은 JSON 이다.
- 상태는 `__CENNAD_STATE__` 슬롯으로만 들어온다.
- user artifact 위치는 런타임 config layer resolver가 주입한 active cennad home을 표시한다.
- 외부 CDN·폰트·`eval` 을 쓰지 않으며 페이지 문구는 영어로 유지한다.

## API Contracts

- 소비 라우트: `GET /`, `GET /config`, `GET /provider-status`, `POST /save`, `POST /close`.

## Acceptance Criteria

### AC-model-effort-pairing — 모델·effort 짝 노출

- 선택된 모델이 광고하지 않은 effort 가 선택지에 나오지 않는다.

### AC-token-on-every-request — 토큰 부착

- 페이지가 보내는 모든 요청에 토큰이 붙는다.

### AC-no-external-assets — 외부 자산 없음

- 페이지가 외부 스크립트·폰트를 로드하지 않는다.

### AC-active-home-host-matrix — 런타임 상태 경로

- Codex·Claude 호스트와 `CENNAD_CONFIG_PATH` override에서 페이지가 실제 user config layer의 cennad home을 표시한다.

### AC-generated-page-sync — 생성 페이지 동기화

- 소스 페이지와 커밋된 `public/settings.html`은 동일한 생성기 출력이며 `build:pages:check`가 불일치를 거부한다.

## Last Updated

2026-08-23 — 호스트별 active home 주입과 생성 산출물 동기화 계약을 추가했다.
