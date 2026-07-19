# DESIGN — 양피지 · 잉크 · 펜촉 · 봉인

deilen FE(viewer·settings)의 디자인 정본. **페이지 수정·추가는 이 문서를 따른다.** 두 페이지의 `styles.css` 는 이 문서의 토큰·규격과 항상 일치해야 하며, 공유 토큰 시트 블록(`Shared token sheet`)은 서로 동일하게 유지한다.

## 에센스

**"양피지 위에 펜촉으로 잉크를 얹고, 다 읽은 자리에 밀랍으로 봉인을 남긴다."**

| 층                 | 의미                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| 양피지 (parchment) | 읽는 면. 따뜻한 크림 중성색 — 다크는 "밤의 서재"(어두운 책상 위에서 글자가 양피지 빛을 낸다).  |
| 잉크 (ink)         | 쓰는 재료. 크롬 전체가 모노크롬 — `--accent` 는 글자색과 동일. 문서 본문은 세리프 활자.        |
| 펜촉 (nib)         | 쓰는 도구. 만년필 펜촉 — 봉인에 각인되는 브랜드 글리프. 잎(❦·hedera)은 브랜드 메타포가 아니다. |
| 봉인 (seal)        | 남기는 표식. 짙은 보르도 `--seal` 은 아이코노그래피 전용 — 브랜드 마크와 전송 완료 오버레이뿐. |

## 원칙

1. 문서가 주인공 — 크롬은 무채색으로 물러난다. 유채색이 상시 노출되는 곳은 코멘트 마크(앰버)뿐.
2. 상태 구분은 채도가 아니라 treatment 로 — wash + inset 밑줄. 새 상태에 새 hue 를 추가하지 않는다.
3. seal 은 면적을 가지지 않는다 — 하이라이트·버튼·칩·틴트 배경 사용 금지. 옅은 붉은(핑크 톤) 틴트 절대 금지.
4. 시스템 폰트만 사용 (동봉 폰트·CDN 금지). 본문 세리프 스택: `Charter, "Iowan Old Style", "Palatino Linotype", Georgia, serif`.
5. viewer·settings 는 토큰 한 벌 — 값 변경은 이 문서를 먼저 고치고 두 `styles.css` 에 동시 반영한다.
6. 새 페이지 추가 시: 공유 토큰 시트 블록을 그대로 복사하고, `--font-ui` 크롬·왁스 실 브랜드 글리프·아래 크롬 규격을 그대로 따른다.

## 토큰 시트

| Token               | Light                   | Dark                    |
| ------------------- | ----------------------- | ----------------------- |
| `--bg`              | `#f8f5ee`               | `#1c1a15`               |
| `--bg-subtle`       | `#f1ede1`               | `#221f19`               |
| `--bg-inset`        | `#e7e2d2`               | `#2b2720`               |
| `--text`            | `#1f1d16`               | `#ebe6d8`               |
| `--text-muted`      | `#6b665a`               | `#a49c88`               |
| `--text-faint`      | `#98917f`               | `#6f695a`               |
| `--border`          | `#e3ddcc`               | `#35302a`               |
| `--border-strong`   | `#cec6b1`               | `#4a4433`               |
| `--divider`         | `#e9e4d4`               | `#4a4433`               |
| `--divider-edge`    | `rgba(255,255,255,.75)` | `rgba(255,255,255,.09)` |
| `--accent`          | `#1f1d16` (= text)      | `#ebe6d8` (= text)      |
| `--accent-hover`    | `#000000`               | `#ffffff`               |
| `--accent-contrast` | `#f8f5ee`               | `#1c1a15`               |
| `--accent-soft`     | `rgba(31,29,22,.07)`    | `rgba(235,230,216,.09)` |
| `--seal`            | `#6d2130`               | `#ad4750`               |
| `--danger`          | `#b3372f`               | `#e0968c`               |
| `--danger-soft`     | `rgba(179,55,47,.1)`    | `rgba(224,150,140,.13)` |
| `--success`         | `#2f6e44`               | `#83c290`               |
| `--mark`            | `rgba(202,141,22,.2)`   | `rgba(226,178,88,.18)`  |
| `--mark-line`       | `rgba(164,110,10,.55)`  | `rgba(226,178,88,.45)`  |
| `--pending`         | `rgba(158,82,110,.11)`  | `rgba(214,146,172,.13)` |
| `--pending-line`    | `rgba(158,82,110,.45)`  | `rgba(214,146,172,.45)` |
| `--syn-keyword`     | `#9c4a2f`               | `#d9a084`               |
| `--syn-string`      | `#41684b`               | `#a9c9a6`               |
| `--syn-number`      | `#91630c`               | `#d9b26e`               |
| `--syn-function`    | `#33697a`               | `#92bcc6`               |
| `--syn-attr`        | `#5d6b34`               | `#b5c48f`               |

공통: `--radius-sm: 4px` · `--radius: 7px` · `--radius-lg: 10px` · `--transition: 160ms ease`. 그림자는 라이트에서 웜 틴트(`rgba(43,36,18,…)`), 다크에서 블랙. 대비는 WCAG AA 기준(본문 4.5:1, 비텍스트 3:1)을 유지한다.

## 타이포그래피

- **문서 본문(`.viewer`)**: `--font-doc` 세리프, `16.5px / 1.75`. 사용자 설정 `font_family` 는 `--font-doc` 를 덮어쓴다. 헤딩 weight 는 700 (Charter 는 400/700 두 웨이트뿐 — 중간값 금지).
- **크롬·settings**: `--font-ui` 산세리프. 섹션 라벨은 `11px` 대문자 + `letter-spacing 0.08em` (viewer 사이드바 타이틀 = settings 필드 라벨 동일 규격).
- **코드**: `--font-mono`.
- 장식은 활자 전통에서: `hr` = 가는 이중 룰 + 중앙 로젠지(`─── ◆ ───`, CSS mask) — `--divider` 채움 + `--divider-edge` 하단 1px 에지로 양피지에 눌린 데보스 각인. 끝부분 컬/스크롤 말림 장식 금지(과함), 잎 오너먼트(❦) 금지. 라이트는 배경 근사색(bg 보다 살짝 어둡게), 다크는 배경보다 밝은 보더 계열 — 다크에서 bg-보다-어두운 각인은 시인성이 없다(일반 디바이더(`--border`) 이상으로 보여야 한다). 인용문 = 잉크 세로줄 + 이탤릭(배경 wash 없음), 링크 = 클래식 밑줄(`underline-offset 3px`, hover 시 진해짐).

## 크롬 규격 (두 페이지 공통)

- 버튼: 높이 `36px`, `--radius-sm`, 3종 — 기본(`--bg` + `--border-strong`) / primary(잉크 채움) / ghost.
- 포커스: 폼 필드 = `border-color: var(--accent)` + `box-shadow 0 0 0 3px var(--accent-soft)`; 그 외 = 전역 `:focus-visible` outline 2px. 예외: viewer 코멘트 composer 는 타이핑 몰입을 깨지 않도록 muted — 컨테이너 보더 `--border-strong`, textarea 포커스 `--text-faint` + 동일 halo.
- 전환은 `var(--transition)` 만 사용 — 지속시간 하드코딩 금지. 예외: 사이드바 슬라이드(0.2s, 대형 이동), 전송 완료 씰 왁스 스웰(5s infinite, 뭉근한 감속 커브, `prefers-reduced-motion` 시 정적 링).
- 브랜드 마크: 만년필 펜촉이 종이에 닿기 직전까지 하단으로 내려앉게 각인된 왁스 실 SVG(`color: var(--seal)`), 두 페이지 동일 글리프.

## 상태 표현

- 코멘트 라인 = 앰버 wash + inset 밑줄(`--mark`/`--mark-line`), 작성 중 = 로즈 wash + 밑줄(`--pending`/`--pending-line`), 드래그 선택 = 회색(`color-mix`). 앵커 칩은 흑연 모노크롬(`--bg-inset` + `--text-muted`) — seal 사용 금지.
- 제출 2버튼(`revise`/`discuss`)은 동일 위계(제품 결정) — 한쪽만 primary/seal 로 올리지 않는다. 봉인은 전송 완료 오버레이 아이콘(48px)에 찍히고, 헤일로가 왁스처럼 뭉근하게 부풀었다 녹는다 — 물 파문(얇은 링·빠른 확산) 금지, 점성 파문만(두꺼운 소프트 밴드·짧은 이동·펄스 사이 휴지기).
- `--danger` 는 주황기 적색으로 `--seal`(와인기)과 용도·계층을 분리 — 오류·파괴적 액션 전용.
