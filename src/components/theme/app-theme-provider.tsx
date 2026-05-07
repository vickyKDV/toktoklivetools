"use client";

import { useEffect, useState, type ReactNode } from "react";

type AppThemeId = "light" | "dark" | "green-black" | "red-black" | "yellow-black" | "blue-black";

const STORAGE_KEY = "app-theme";
const DEFAULT_THEME: AppThemeId = "dark";

const appThemes: Array<{
  id: AppThemeId;
  label: string;
}> = [
  { id: "light", label: "Terang" },
  { id: "dark", label: "Gelap" },
  { id: "green-black", label: "Hijau Hitam" },
  { id: "red-black", label: "Merah Hitam" },
  { id: "yellow-black", label: "Kuning Hitam" },
  { id: "blue-black", label: "Biru Hitam" }
];

function isAppTheme(value: string | null): value is AppThemeId {
  return appThemes.some((theme) => theme.id === value);
}

function applyAppTheme(theme: AppThemeId) {
  document.documentElement.dataset.appTheme = theme;
  document.documentElement.classList.toggle("dark", theme !== "light");
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    applyAppTheme(isAppTheme(storedTheme) ? storedTheme : DEFAULT_THEME);
  }, []);

  return children;
}

export function AppThemeSelect() {
  const [selectedTheme, setSelectedTheme] = useState<AppThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const nextTheme = isAppTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
    setSelectedTheme(nextTheme);
    applyAppTheme(nextTheme);
  }, []);

  function handleThemeChange(theme: AppThemeId) {
    setSelectedTheme(theme);
    applyAppTheme(theme);
  }

  return (
    <select
      aria-label="Dashboard theme"
      value={selectedTheme}
      onChange={(event) => handleThemeChange(event.target.value as AppThemeId)}
      className="h-9 rounded-md border border-input bg-card px-3 text-xs font-semibold text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    >
      {appThemes.map((theme) => (
        <option key={theme.id} value={theme.id}>
          {theme.label}
        </option>
      ))}
    </select>
  );
}
