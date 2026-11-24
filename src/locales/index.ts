import enAuth from "./en/auth.json"
import itAuth from "./it/auth.json"

export type AuthLocale = typeof enAuth
export type LocaleCode = "en" | "it"

const catalogs: Record<LocaleCode, AuthLocale> = {
  en: enAuth,
  it: itAuth,
}

export const DEFAULT_LOCALE: LocaleCode = "en"

export const resolveLocale = (raw: string | null | undefined): LocaleCode => {
  if (!raw) return DEFAULT_LOCALE
  const base = raw.trim().toLowerCase().slice(0, 2)
  return base === "it" ? "it" : "en"
}

export const getAuthStrings = (locale: LocaleCode): AuthLocale => catalogs[locale]

export const formatAuthString = (
  template: string,
  vars: Record<string, string>
): string =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`)
