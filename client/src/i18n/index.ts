import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import uk from './locales/uk.json'

export const I18N_STORAGE_KEY = 'i18nextLng'
export const SUPPORTED_LANGUAGES = ['en', 'uk'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      uk: { translation: uk },
    },
    // Fixed for the very first render, on purpose: the server has no access
    // to localStorage, so it can't know a visitor's stored language and
    // must render *something* deterministic. If this instead auto-detected
    // (i18next-browser-languagedetector, localStorage/navigator) the server
    // and the client's first paint would disagree on every translated
    // string, and React's hydration fails as a text mismatch. The real
    // preference is applied after hydration via syncLanguage() below, from
    // a useEffect — a normal post-mount update, not part of the hydration
    // pass, so it can't cause a mismatch.
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false,
    },
  })

function isSupported(v: string | null): v is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(v ?? '')
}

/** Changes the active language and persists the choice for next visit. */
export function setLanguage(lang: SupportedLanguage) {
  void i18n.changeLanguage(lang)
  localStorage.setItem(I18N_STORAGE_KEY, lang)
}

export function toggleLanguage() {
  setLanguage(i18n.language === 'en' ? 'uk' : 'en')
}

/** Applies the visitor's stored language preference — call once, after mount. */
export function syncStoredLanguage() {
  const stored = localStorage.getItem(I18N_STORAGE_KEY)
  if (isSupported(stored) && stored !== i18n.language) {
    void i18n.changeLanguage(stored)
  }
}

export default i18n
