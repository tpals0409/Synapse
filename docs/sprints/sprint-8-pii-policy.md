# Sprint 8 — PII 처리 정책 (frozen)

> **[FROZEN v2026-04-30 D-S8-pii-policy]**
> 본 정책은 Sprint 8 외부 테스터 dogfooding 데이터 수집의 *영구* 익명화 규칙입니다.
> raw text fixture 검증: `scripts/receipt/.receipt-runner/sprint8-pii-policy.mjs` (receipt step 56).

---

## 0. 적용 범위

본 정책은 Sprint 8 외부 테스터 N≥3 사용자의 다음 데이터 채널에 적용됩니다:
- mobile 클라이언트 (apps/mobile) 가 emit 하는 모든 telemetry event
- storage (SQLite) 의 `recall_log`, `decision_log`, `satisfaction_survey`, `concept`, `concept_edge`, `message`, `embedding` 모든 row
- `docs/sprints/sprint-8-data/raw/<session-hash>.json` export 파일
- `docs/sprints/sprint-8-data/index.md` 분석 리포트 inline 인용

**Out**: 외부 테스터 디바이스 *내부* SQLite 파일 — 사용자 본인의 디바이스에 머무름. export 시점부터 본 정책 적용.

---

## 1. 익명화 규칙 5종 (영구 박힘)

### Rule 1: 사용자 식별자 SHA-256 hash

- **대상**: 사용자 이름, 디바이스 식별자, 이메일, 전화번호, OAuth 토큰, 세션 ID 등 사용자 직접 식별 가능한 모든 토큰.
- **처리**: SHA-256 hash + salt = `sprint-8-salt` (raw text fixture 검증 키워드).
- **적용 위치**: **mobile `telemetryStore.emit` 직전**. storage 는 hash 후 plain row 만 받음 — storage 측 hash 처리 책임 0 (`[DIRECTIVE D-S8-storage-shape-ack]` 정합).
- **format**: `<session-hash>` = `sha256(salt + user_identifier).hex().slice(0, 16)` (16자 truncated).
- **불가역**: salt 는 세션 export 후 *폐기*. 동일 사용자라도 Sprint 8 종료 시 hash 추적 불가.

### Rule 2: raw text 격리 (디폴트)

- **대상**: 사용자 입력 메시지 (`message.content`), assistant 응답 텍스트, Concept label raw text, 만족도 설문 자유 코멘트.
- **처리**: **raw text 는 export 채널에 포함하지 않음** (디폴트). 디바이스 내부 SQLite 에는 그대로 보존 (사용자 본인 access).
- **export 시 대체**: 임베딩 (768d float vector) + 메타 (ts, actor, action, score, label-hash) 만 포함.
- **합의 양식 분기**: carry-over 11 (LLM-based negation classifier) 가 *raw text 학습 데이터* 필요한 경우, **별도 합의 양식** (`docs/sprints/sprint-8-data/consent-form.md` 의 §opt-in-raw-text 섹션) 서명 받은 사용자만 raw text 채널 활성화. 디폴트 합의는 raw text 격리.

### Rule 3: 임베딩 보존 (768d float vector)

- **대상**: Concept embedding, message embedding (sqlite-vec 인덱스).
- **처리**: 그대로 export (768d 부동소수점). 임베딩에서 raw text 역추적은 *연구 영역* (gradient inversion attack) — 본 정책은 해당 위협 모델 외.
- **사유**: Concept dedup (carry-over 9) + recall hit/miss 분석 (T8 분석 입력) 이 임베딩 의존.

### Rule 4: 메타 통계 보존

- **대상**: `ts` (millisecond UTC), `actor` (`'orchestrator'|'mobile'|'engine'|'conversation'`), `action` (`DecisionLogAction` union), `score` (1~5), `recall_log.dismissed_at`, `concept_edge.weight`, `decay_applied_at`, `retracted_at`.
- **처리**: 그대로 export. 분석 6종 집계 지표 (recall hit / dismiss / retraction / dedup / retention / negation miss / 만족도) 가 메타 통계 의존.
- **단**: `ts` 는 절대 시각 그대로 보존 (외부 데이터 시간축 분석 필요). 사용자 디바이스 timezone 추론 가능성 = 본 정책 허용.

### Rule 5: 학습 데이터 합의 양식

- **대상**: Rule 2 의 raw text 채널 활성화 사용자 한정.
- **양식 위치**: `docs/sprints/sprint-8-data/consent-form.md` §opt-in-raw-text.
- **처리**: 별도 채널 `docs/sprints/sprint-8-data/raw-text-opt-in/<session-hash>.jsonl` 에 raw text + 임베딩 매핑 저장 (해당 사용자 한정).
- **사유**: carry-over 11 LLM-based negation classifier 가 heuristic miss 사례를 LLM 학습 입력으로 사용할 수 있는 경로. 디폴트 합의는 비활성.
- **취소권**: 사용자가 사후 학습 데이터 채널 철회 요청 시 즉시 `raw-text-opt-in/<session-hash>.jsonl` 삭제 + hash 매핑 폐기.

---

## 2. export 파이프라인

```
[외부 테스터 디바이스 SQLite]
  → export script (있는 경우, T2 모집 인프라 박을 때 명시)
  → Rule 1: 사용자 식별자 → SHA-256 hash (salt='sprint-8-salt')
  → Rule 2: raw text → 격리 (디폴트) OR raw-text-opt-in 채널 (Rule 5 합의 시)
  → Rule 3: 임베딩 → 그대로
  → Rule 4: 메타 → 그대로
  → docs/sprints/sprint-8-data/raw/<session-hash>.json
    {
      "session_hash": "<16자 hex>",
      "ts_range": [<min_ts>, <max_ts>],
      "events": [
        { "ts": <int>, "actor": <str>, "action": <str>, "payload_meta": <obj> },
        ...
      ],
      "embeddings": [
        { "concept_hash": "<sha256(label).hex()[0:16]>", "vec": [<768 floats>] },
        ...
      ],
      "satisfaction": [
        { "ts": <int>, "score": <1~5>, "comment_meta": { "len": <int>, "lang": <"ko"|"en"> }, "session_marker": <"mid"|"end"> },
        ...
      ]
    }
```

---

## 3. 책임 분리

| Owner | 책임 |
|---|---|
| **mobile (T5)** | telemetryStore.emit 직전 Rule 1 hash 적용 + Rule 4 메타 그대로 + Rule 2 raw text 격리. consent-form §opt-in-raw-text 활성 시 Rule 5 채널 분기. |
| **storage (T3)** | hash 후 plain row 만 받음. hash 처리 책임 0. `decision_log` / `satisfaction_survey` / `recall_log` 테이블에 메타 + Rule 1 hash 만 저장. |
| **engine (T6/T7)** | Rule 3 임베딩 분석 (Concept dedup) + Rule 5 raw-text-opt-in 채널 사용 (carry-over 11 LLM 도입 시). |
| **team-leader (T2/T8)** | consent-form 양식 박음 + export script 책임 + `docs/sprints/sprint-8-data/index.md` 분석 시 본 정책 inline 인용. |
| **PM (직접)** | 외부 테스터 모집 + Rule 5 합의 양식 서명 받음 + 보상 / 법무 검토. |

---

## 4. 위반 처리

- 본 정책 위반 (raw text export 채널 디폴트 활성화 / hash salt 누설 / Rule 5 미합의 사용자 raw text 저장 등) 발견 시:
  1. 즉시 export 채널 정지.
  2. 영향 사용자 통보.
  3. `docs/sprints/sprint-8-pii-policy.md` 부록에 incident 기록 + 다음 sprint carry-over 박음.

---

## 5. raw text fixture 검증 키워드 (receipt step 56 입력)

`scripts/receipt/.receipt-runner/sprint8-pii-policy.mjs` 가 본 문서에서 다음 5종 키워드 raw text 검증:

1. `SHA-256 hash` + `sprint-8-salt`
2. `raw text 격리`
3. `임베딩 보존` 또는 `768d`
4. `메타 통계 보존`
5. `학습 데이터 합의 양식` 또는 `opt-in-raw-text`

5종 모두 발견 = step 56 PASS.

---

**[FROZEN v2026-04-30 D-S8-pii-policy]** — revert 비용: 본 문서 + storage T3 hash 가정 정합 + mobile T5 emit 직전 hash 적용 = 약 30분.
