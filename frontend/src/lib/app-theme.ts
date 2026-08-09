export const APP_THEME_STORAGE_KEY = "app-theme";
export const APP_THEME_COOKIE = "app-theme";

export type AppTheme = "light" | "dark";

export function readAppTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem(APP_THEME_STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  }
}

/** Keeps immediate client styling and the next server render in agreement. */
export function persistAppTheme(theme: AppTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
  } catch {
    // Cookies still preserve the theme when private storage is unavailable.
  }
  document.cookie = `${APP_THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
