---
id: plugins-seiri-739b78
fractal_path: plugins/seiri
file_path: plugins/seiri/INTENT.md
created_at: "2026-07-25T10:30:00Z"
review_branch: seiri--skill-ivoke
original_fix_id: ADV-002
severity: LOW
weight: 1
touch_count: 0
last_review_commit: null
rule_violated: intentmd-line-cap-margin (INTENT.md 50-line hard cap, 40-50 warning band)
metric_value: 9 changed INTENT.md files at 48-49 lines (cap 50)
---

# 기술 부채: seiri INTENT.md files sit 1-2 lines below the 50-line hard cap
## 원래 수정 요청
Compress existing INTENT.md prose before adding new boundary or convention lines; split modules whose docs no longer fit.
## 개발자 소명
Advisory ledger count reached 3 across three separate review runs (feature--97-98@b6c1d5a8 x2, seiri--skill-ivoke@cb0c117e). No file is over the cap, so nothing is blocked today — but at 49 lines a line-neutral edit is already refused by the pre-tool-use hook, which makes the next doc change on these modules unexpectedly expensive.
## 정제된 ADR
Accepted as LOW debt. The 50-line cap is a decomposition signal by design, and these modules are still cohesive. Resolution path: when a module's INTENT.md next needs a new line, compress first (drop redundant Structure rows, tighten Conventions) and only split if compression fails. Do not raise the cap.
