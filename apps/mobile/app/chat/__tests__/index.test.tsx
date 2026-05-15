// Sprint 14 (B1) — FirstChat 단위 테스트.
//
// 검증 대상 (2 건, 헌법 7 (a) 4 조건 내):
//   1) Platform.OS === 'web' + 빈 메시지 → demoHint 렌더 (queryByText truthy).
//   2) Platform.OS === 'ios' + 빈 메시지 → demoHint 미렌더 (queryByText null).
//
// 본 테스트는 chat/index.tsx 의 web 분기 mount 정합 + Sprint 13 (T2) 회귀 가드 + 본 슬라이스의
// theme-aware swap (themeColorsHex.ink) 후에도 카피 렌더 동작 보존 검증.
//
// 의존성 mock:
//   - ../../src/chatStore — storage 의존성 절단 (listMessages → [], sendStream / subscribeError noop).
//   - ../../src/conceptStore — subscribe noop unsubscribe.
//   - ../../src/recallStore — subscribe noop unsubscribe.
//   - ../../src/telemetryStore — emit / shouldShowMidSessionSurvey / markSurveyShown noop.
//   - ../../src/themeStore — useTheme() 가 light colorsHex 반환 (테마 swap 자체는 별도 검증 영역).
//
// react-test-renderer 사용 — testing-library 의존성 없이 노드 트리 walk 으로 Text 콘텐츠 검증.

// @types/jest 가 jest / describe / it / expect / beforeEach 를 글로벌로 노출 → import 불필요.
// chat/index.tsx import 전에 mock 설치 — hoist 안정성.
jest.mock('../../../src/chatStore', () => ({
  listMessages: () => [],
  // 빈 async iterable 반환 — async generator 사용 시 babel helper (_wrapAsyncGenerator) 가
  // out-of-scope reference 가 되어 mock factory 가 거부됨. Symbol.asyncIterator + next() 단순 객체.
  sendStream: () => ({
    [Symbol.asyncIterator]() {
      return {
        next: () => Promise.resolve({ value: undefined, done: true }),
      };
    },
  }),
  subscribeError: () => () => undefined,
}));

jest.mock('../../../src/conceptStore', () => ({
  subscribe: () => () => undefined,
}));

jest.mock('../../../src/recallStore', () => ({
  subscribe: () => () => undefined,
}));

jest.mock('../../../src/telemetryStore', () => ({
  emit: () => undefined,
  shouldShowMidSessionSurvey: () => false,
  markSurveyShown: () => undefined,
}));

jest.mock('../../../src/themeStore', () => {
  const ds = jest.requireActual('@synapse/design-system') as { colorsHex: { light: unknown; dark: unknown } };
  return {
    useTheme: () => ({
      systemTheme: 'light',
      userOverride: null,
      effectiveTheme: 'light',
      setOverride: () => undefined,
      clearOverride: () => undefined,
      colors: ds.colorsHex.light,
      colorsHex: ds.colorsHex.light,
    }),
  };
});

import { Platform } from 'react-native';
import TestRenderer from 'react-test-renderer';
import FirstChat from '../index';

// 트리에서 type === 'Text' 노드 children 을 평탄화해 substring 검색.
// react-test-renderer 의 Text 호스트 컴포넌트는 type 'RCTText' 또는 'Text' 로 나옴 (jest-expo mock 환경).
function findTextNode(root: TestRenderer.ReactTestInstance, needle: string): boolean {
  try {
    const matches = root.findAll((node: TestRenderer.ReactTestInstance) => {
      if (typeof node.type !== 'string') return false;
      // host text 컴포넌트 식별 — jest-expo preset 은 RN Text 를 'Text' 로 mock.
      if (!/Text/.test(node.type)) return false;
      const children = node.props.children;
      const flat = Array.isArray(children) ? children.join('') : String(children ?? '');
      return flat.includes(needle);
    });
    return matches.length > 0;
  } catch {
    return false;
  }
}

const DEMO_HINT_KO = '이건 웹 데모예요. 진짜 기억은 모바일에서 시작돼요.';

describe('FirstChat demoHint web/native branching', () => {
  beforeEach(() => {
    // jest.setup.ts 의 afterEach 가 'ios' 로 복원. 각 테스트가 명시적으로 swap.
  });

  it('Platform.OS=web — empty state 에서 demoHint 가 렌더된다', () => {
    (Platform as { OS: string }).OS = 'web';
    let tree!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tree = TestRenderer.create(<FirstChat />);
    });
    const rendered = findTextNode(tree.root, DEMO_HINT_KO);
    expect(rendered).toBe(true);
    tree.unmount();
  });

  it('Platform.OS=ios — empty state 에서도 demoHint 가 렌더되지 않는다', () => {
    (Platform as { OS: string }).OS = 'ios';
    let tree!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tree = TestRenderer.create(<FirstChat />);
    });
    const rendered = findTextNode(tree.root, DEMO_HINT_KO);
    expect(rendered).toBe(false);
    tree.unmount();
  });
});
