// Sprint 6 — Humble Retraction 부정 신호 감지.
// [FROZEN v2026-04-29 D-S6-conversation-retraction-pattern-matching] — 패턴 매칭 default.
// LLM 분류는 Sprint 7+ (latency + cost + 결정성 약화 사유). PM HOLD 후보였으나 결정성 우선.
//
// 결정성 보강: 첫 단어/구문 매칭 (^anchor). 전체 문장 검색 X — 예: "그건 다른 얘기지만, 사실..."
// 같은 mid-sentence 사용은 *부정 신호 아님* 으로 처리.
// regex 분리 (ko / en) — 향후 언어 확장 시 alternation 만 추기.

const KO_RETRACTION = /^\s*(아니|아니야|아냐|그건 아니|그건 다른|틀렸|잘못)/i;
const EN_RETRACTION = /^\s*(no\b|no,|no\s+that['']s|that['']s wrong|not what|wrong\b|i didn['']t)/i;

export function detectRetractionSignal(text: string): boolean {
  if (typeof text !== 'string' || text.length === 0) return false;
  return KO_RETRACTION.test(text) || EN_RETRACTION.test(text);
}
