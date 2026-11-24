/** Apply DESIGN light/dark theme via documentElement data-theme (CV-198). */

export type ThemePref = "system" | "light" | "dark"

export const applyTheme = (
  theme: ThemePref,
  root: HTMLElement = document.documentElement
): void => {
  if (theme === "system") {
    root.removeAttribute("data-theme")
    return
  }
  root.setAttribute("data-theme", theme)
}

export const readThemeAttr = (
  root: HTMLElement = document.documentElement
): string | null => root.getAttribute("data-theme")
