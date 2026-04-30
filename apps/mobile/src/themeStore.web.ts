// Web adapter — Sprint 7 (T5) themeStore.web.
// carry-over 1 platform-adapter 패턴 7회차 — native (.ts) + web (.web.ts) 짝.
//
// 책임 동일:
//   1) systemTheme: react-native-web 의 useColorScheme (matchMedia 위임).
//   2) userOverride: in-memory + window.localStorage 영속.
//   3) effectiveTheme = userOverride ?? systemTheme.
//   4) ThemeProvider / useTheme 시그니처 native 와 100% 일치.
//
// 영속 어댑터: web 은 항상 localStorage (sync API 를 Promise 로 wrap).
//   PM 결정 (A/B/C) 어떤 것이 박혀도 web 은 localStorage 가 표준이라 영향 0.
//
// native-only import 0 (AsyncStorage / expo-file-system / better-sqlite3 / sqlite-vec 미import) —
// web bundle 검증 step `web-bundle-no-native` 가 grep 으로 0 hits 보장.

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { colors as colorsTokens, colorsHex } from '@synapse/design-system';

export type EffectiveTheme = 'light' | 'dark';
export type UserOverride = EffectiveTheme | null;

export interface ThemeStorageAdapter {
  load(): Promise<UserOverride>;
  save(theme: UserOverride): Promise<void>;
}

const STORAGE_KEY = 'synapse:theme';

// localStorage 어댑터 — web 표준. SSR/non-browser 환경 (jest-node) 안전 가드.
const LocalStorageAdapter: ThemeStorageAdapter = {
  load: async () => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === 'light' || raw === 'dark') return raw;
      return null;
    } catch {
      return null;
    }
  },
  save: async (theme) => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      if (theme === null) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, theme);
      }
    } catch {
      // localStorage 가 disabled (private mode / quota) 환경에서도 화면은 동작해야 함.
    }
  },
};

export const NoopThemeStorageAdapter: ThemeStorageAdapter = {
  load: async () => null,
  save: async () => undefined,
};

const adapter: ThemeStorageAdapter = LocalStorageAdapter;

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
  forcedOverride?: UserOverride;
}

export function ThemeProvider({ children, forcedOverride }: ThemeProviderProps) {
  const sys = useColorScheme();
  const systemTheme: EffectiveTheme = sys === 'dark' ? 'dark' : 'light';

  const [userOverride, setUserOverrideState] = useState<UserOverride>(forcedOverride ?? null);

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
