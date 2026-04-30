// Native (iOS/Android) adapter — Sprint 7 (T5) themeStore.
// carry-over 1 platform-adapter 패턴 7회차 — native (.ts) + web (.web.ts) 짝.
//
// 책임:
//   1) systemTheme: RN Appearance API (useColorScheme) 추적 → 'light' | 'dark'.
//   2) userOverride: in-memory + (선택) 영속 어댑터. 'light' | 'dark' | null.
//   3) effectiveTheme = userOverride ?? systemTheme.
//   4) ThemeProvider: design-system colors[effectiveTheme] / colorsHex[effectiveTheme] 라우팅.
//   5) useTheme(): { effectiveTheme, userOverride, setOverride, clearOverride, colors, colorsHex }.
//
// 영속 어댑터 (ThemeStorageAdapter 인터페이스 동결):
//   load(): Promise<'light' | 'dark' | null>
//   save(theme: 'light' | 'dark' | null): Promise<void>
//
// [FROZEN v2026-04-30 D-S7-mobile-themeStore-persistence-deps] **A안 채택** —
//   native: AsyncStorageAdapter (`@react-native-async-storage/async-storage`)
//   web:    LocalStorageAdapter (window.localStorage) — themeStore.web.ts
//   사유: RN/Expo 표준, LOC 최소, dev doc §3 In 정합. revert 비용 5분 (1 패키지 + adapter 1 파일).
//
// web bundle 보호: 본 파일은 .web.ts 로 대체되므로 web bundle 에 AsyncStorage import 0.
//   - react-native (Appearance) 는 web 에도 존재 (react-native-web) → web 짝에서 동일 API.
//   - AsyncStorage 는 본 파일에서만 import → metro platform extension `.web.ts` 우선 → 0 hits.

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as colorsTokens, colorsHex } from '@synapse/design-system';

export type EffectiveTheme = 'light' | 'dark';
export type UserOverride = EffectiveTheme | null;

export interface ThemeStorageAdapter {
  load(): Promise<UserOverride>;
  save(theme: UserOverride): Promise<void>;
}

// Noop 어댑터 — 테스트/안전 fallback 용 export. 영속 0.
export const NoopThemeStorageAdapter: ThemeStorageAdapter = {
  load: async () => null,
  save: async () => undefined,
};

const STORAGE_KEY = 'synapse:theme';

// AsyncStorage 어댑터 — [FROZEN D-S7-mobile-themeStore-persistence-deps] A안.
// AsyncStorage 호출 실패 (스토리지 corrupt / 권한 / quota) 시에도 화면은 동작 → catch silent.
const AsyncStorageAdapter: ThemeStorageAdapter = {
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw === 'light' || raw === 'dark') return raw;
      return null;
    } catch {
      return null;
    }
  },
  save: async (theme) => {
    try {
      if (theme === null) {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, theme);
      }
    } catch {
      // 영속 실패해도 in-memory userOverride 는 유지 — 사용자 토글 즉응성 보존.
    }
  },
};

const adapter: ThemeStorageAdapter = AsyncStorageAdapter;

// 시그니처: light/dark 둘 다 같은 토큰 키 셋 (paper/ink/synapse) 을 가지므로
// shape 은 동일. literal type narrowing 회피를 위해 string 으로 추상화.
export type ThemeColors = { readonly paper: string; readonly ink: string; readonly synapse: string };

export interface ThemeContextValue {
  systemTheme: EffectiveTheme;
  userOverride: UserOverride;
  effectiveTheme: EffectiveTheme;
  setOverride(theme: UserOverride): void;
  clearOverride(): void;
  colors: ThemeColors;
  colorsHex: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  /** 테스트/스토리북용 강제 override. 일반 사용자 흐름에서는 미주입. */
  forcedOverride?: UserOverride;
}

export function ThemeProvider({ children, forcedOverride }: ThemeProviderProps) {
  const sys = useColorScheme();
  const systemTheme: EffectiveTheme = sys === 'dark' ? 'dark' : 'light';

  const [userOverride, setUserOverrideState] = useState<UserOverride>(forcedOverride ?? null);

  // cold start — 어댑터에서 영속 토글 복원. forcedOverride 미주입 시에만.
  useEffect(() => {
    if (forcedOverride !== undefined) return;
    let cancelled = false;
    adapter.load().then((persisted) => {
      if (!cancelled && persisted !== null) {
        setUserOverrideState(persisted);
      }
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [forcedOverride]);

  const setOverride = useCallback((theme: UserOverride) => {
    setUserOverrideState(theme);
    adapter.save(theme).catch(() => undefined);
  }, []);

  const clearOverride = useCallback(() => {
    setUserOverrideState(null);
    adapter.save(null).catch(() => undefined);
  }, []);

  const effectiveTheme: EffectiveTheme = userOverride ?? systemTheme;

  const value = useMemo<ThemeContextValue>(() => ({
    systemTheme,
    userOverride,
    effectiveTheme,
    setOverride,
    clearOverride,
    colors: colorsTokens[effectiveTheme],
    colorsHex: colorsHex[effectiveTheme],
  }), [systemTheme, userOverride, effectiveTheme, setOverride, clearOverride]);

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be called inside <ThemeProvider>');
  }
  return ctx;
}
