import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { setDateLocale, type AppLanguage } from '../lib/date'
import { idTranslations } from './translations'

export type Language = AppLanguage

interface I18nContextValue {
  language: Language
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const STORAGE_KEY = 'anatera-sprint-os:language'
const I18nContext = createContext<I18nContextValue | null>(null)

function readLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'id') return stored
    const browser = navigator.language.toLowerCase()
    if (browser.startsWith('id')) return 'id'
  } catch {
    // Ignore storage access failures.
  }
  return 'en'
}

function interpolate(value: string, vars?: Record<string, string | number>): string {
  if (!vars) return value
  return Object.entries(vars).reduce((result, [key, replacement]) => {
    return result.split(`{${key}}`).join(String(replacement))
  }, value)
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const initial = readLanguage()
    setDateLocale(initial)
    if (typeof document !== 'undefined') document.documentElement.lang = initial === 'id' ? 'id' : 'en'
    return initial
  })

  useEffect(() => {
    setDateLocale(language)
    document.documentElement.lang = language === 'id' ? 'id' : 'en'
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // Ignore storage access failures.
    }
  }, [language])

  const setLanguage = useCallback((next: Language) => setLanguageState(next), [])
  const toggleLanguage = useCallback(
    () => setLanguageState((current) => (current === 'en' ? 'id' : 'en')),
    [],
  )

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const translated = language === 'id' ? idTranslations[key] ?? key : key
      return interpolate(translated, vars)
    },
    [language],
  )

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}

export function languageName(language: Language): string {
  return language === 'id' ? 'Bahasa Indonesia' : 'English'
}
