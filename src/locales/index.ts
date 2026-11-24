import enAuth from "./en/auth.json"
import itAuth from "./it/auth.json"
import enPlay from "./en/play.json"
import itPlay from "./it/play.json"
import enPlayShell from "./en/play-shell.json"
import itPlayShell from "./it/play-shell.json"

export type AuthLocale = typeof enAuth
export type PlayLocale = typeof enPlay
export type PlayShellLocale = typeof enPlayShell
export type LocaleCode = "en" | "it"

const authCatalogs: Record<LocaleCode, AuthLocale> = {
  en: enAuth,
  it: itAuth,
}

const playCatalogs: Record<LocaleCode, PlayLocale> = {
  en: enPlay,
  it: itPlay,
}

const playShellCatalogs: Record<LocaleCode, PlayShellLocale> = {
  en: enPlayShell,
  it: itPlayShell,
}

export const DEFAULT_LOCALE: LocaleCode = "en"

export const resolveLocale = (raw: string | null | undefined): LocaleCode => {
  if (!raw) return DEFAULT_LOCALE
  const base = raw.trim().toLowerCase().slice(0, 2)
  return base === "it" ? "it" : "en"
}

export const getAuthStrings = (locale: LocaleCode): AuthLocale => authCatalogs[locale]

export const getPlayStrings = (locale: LocaleCode): PlayLocale => playCatalogs[locale]

export const getPlayShellStrings = (locale: LocaleCode): PlayShellLocale =>
  playShellCatalogs[locale]

export const formatLocaleString = (
  template: string,
  vars: Record<string, string>
): string =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`)

/** @deprecated Use formatLocaleString */
export const formatAuthString = formatLocaleString
