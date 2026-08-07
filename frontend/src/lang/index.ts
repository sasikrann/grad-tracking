import { en } from './en'
import { th } from './th'

export type AppLanguage = 'en' | 'th'
type DotPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPaths<T[K]>}`
}[keyof T & string]
export type TranslationKey = DotPaths<typeof en>

const messages = { en, th }

export function translate(
  language: AppLanguage,
  key: TranslationKey,
  params: Record<string, string | number> = {},
) {
  const value = key
    .split('.')
    .reduce<unknown>(
      (current, part) =>
        current && typeof current === 'object'
          ? (current as Record<string, unknown>)[part]
          : undefined,
      messages[language],
    )
  const text = typeof value === 'string' ? value : key
  return Object.entries(params).reduce(
    (result, [name, replacement]) => result.split(`{${name}}`).join(String(replacement)),
    text,
  )
}
