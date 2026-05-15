// Sprint 14 (B1) — jest 단위 테스트 인프라.
// Expo SDK 52 공식 preset (jest-expo) 사용 — RN 모듈 transform / Platform mock 기본 제공.
//
// 책임:
//   1) jest-expo preset — RN + Expo 모듈을 babel-preset-expo 로 transform.
//   2) setupFilesAfterEnv: jest.setup.ts — Platform.OS 전역 mock util 노출.
//   3) testMatch: app/**/__tests__/*.test.tsx + __tests__/*.test.ts(x).
//
// transformIgnorePatterns: jest-expo preset 의 RN/Expo 패키지 allowlist 그대로 사용
// (preset 자체가 react-native / @react-native / expo 계열은 transform 통과시킴).
//
// jest-expo preset (sdk-52 = 52.0.6) 은 react-native 0.76 + react 18.3 와 호환.
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '<rootDir>/app/**/__tests__/**/*.test.ts',
    '<rootDir>/app/**/__tests__/**/*.test.tsx',
    '<rootDir>/__tests__/**/*.test.ts',
    '<rootDir>/__tests__/**/*.test.tsx',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // pnpm 의 `.pnpm/` 가상 디렉토리는 jest-expo preset 기본 ignore 정규식이 매칭하지 못함.
  // RN / Expo / @synapse 패키지를 강제로 transform 통과시킴 (Flow / TS / JSX 처리 위해).
  transformIgnorePatterns: [
    'node_modules/.pnpm/(?!(@?react-native|@react-native-async-storage|expo(nent)?|@expo(nent)?|@expo-google-fonts|expo-.*|@synapse)[@+])',
  ],
};
