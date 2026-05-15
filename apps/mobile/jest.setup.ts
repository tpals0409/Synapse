// Sprint 14 (B1) — jest setup. jest-expo preset 이 RN mock 을 기본 제공하므로,
// 본 파일은 테스트별 OS swap helper 만 노출.
//
// 각 테스트가 `setPlatformOS('web' | 'ios' | 'android')` 호출 → Platform.OS 가 그 값으로 변경.
// jest-expo 의 기본 mock 은 Platform.OS='ios'. mock 자체 재정의는 jest.doMock 으로 테스트 안에서 처리.

import { Platform } from 'react-native';

export function setPlatformOS(os: 'web' | 'ios' | 'android'): void {
  // RN Platform 모듈은 단일 객체 — OS 필드만 mutate (jest-expo mock 환경에서 안전).
  // 본 워크어라운드는 jest-expo preset 의 Platform mock 이 plain object 라 가능.
  (Platform as { OS: string }).OS = os;
}

// 전역에 helper 노출 — 테스트 파일이 import 없이 사용 가능 (선택, import 도 동작).
declare global {

  var __setPlatformOS: (os: 'web' | 'ios' | 'android') => void;
}

globalThis.__setPlatformOS = setPlatformOS;

// 각 테스트 종료 후 OS 복원 — 다른 테스트 간 격리.
afterEach(() => {
  setPlatformOS('ios');
});
