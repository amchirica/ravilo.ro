"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "ravilo-theme";

type ThemeSnapshot = { theme: ThemeChoice; resolvedTheme: ResolvedTheme };

const SERVER_SNAPSHOT: ThemeSnapshot = { theme: "system", resolvedTheme: "light" };

let cachedRaw: string | null = null;
let cachedSnapshot: ThemeSnapshot = SERVER_SNAPSHOT;

function systemDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(theme: ThemeChoice): ResolvedTheme {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return systemDark() ? "dark" : "light";
}

function readChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    /* private mode */
  }
  return "system";
}

function refreshSnapshot(): ThemeSnapshot {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  const raw = `${readChoice()}:${systemDark() ? "d" : "l"}`;
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  const theme = readChoice();
  cachedSnapshot = { theme, resolvedTheme: resolve(theme) };
  return cachedSnapshot;
}

const listeners = new Set<() => void>();

function emit() {
  cachedRaw = null;
  refreshSnapshot();
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (typeof window === "undefined") return () => listeners.delete(onStoreChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", emit);
  window.addEventListener("storage", emit);
  return () => {
    listeners.delete(onStoreChange);
    media.removeEventListener("change", emit);
    window.removeEventListener("storage", emit);
  };
}

function applyDom(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

function writeTheme(theme: ThemeChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private mode */
  }
  applyDom(resolve(theme));
  emit();
}

type ThemeContextValue = ThemeSnapshot & { setTheme: (theme: ThemeChoice) => void };

const ThemeContext = createContext<ThemeContextValue>({
  ...SERVER_SNAPSHOT,
  setTheme: () => undefined,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, refreshSnapshot, () => SERVER_SNAPSHOT);
  const setTheme = useCallback((theme: ThemeChoice) => writeTheme(theme), []);
  const value = useMemo<ThemeContextValue>(
    () => ({ theme: snapshot.theme, resolvedTheme: snapshot.resolvedTheme, setTheme }),
    [snapshot, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
