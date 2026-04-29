// Sprint 5 T1.5 — engine types thin re-export shim (D-S5-engine-types-thin-shim).
// Concept / GraphEdge / EdgeKind 는 protocol 단일 출처 (D-S5-protocol-concept-edge-migration).
// engine 자체 모듈은 protocol 을 직접 import 한다 (이 shim 우회). 외부 (mobile/storage/design-system)
// 의 기존 `from '@synapse/engine'` import 경로를 깨지 않기 위한 호환층.
export type { Concept, GraphEdge, EdgeKind } from '@synapse/protocol';

// engine-only RecallReason — Sprint 5 합집합 RecallCandidate 는 protocol RecallCandidate 직접 사용
// (이전 engine RecallCandidate 는 Sprint 4 까지 별개 형태였으나 본 sprint 부터 polymorphic source 단일화).
export type RecallReason = 'semantic' | 'bridge' | 'temporal' | 'domain_crossing';
