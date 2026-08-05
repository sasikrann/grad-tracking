import { computed, ref } from 'vue'

export type AppLanguage = 'en' | 'th'

// Keep language handling internal until the localized UI is ready to expose a selector.
const language = ref<AppLanguage>('en')
document.documentElement.lang = language.value

export function formatAcademicYear(year: string | number, targetLanguage = language.value) {
  const numericYear = Number(year)
  if (!Number.isFinite(numericYear)) return String(year)
  return String(targetLanguage === 'th' ? numericYear + 543 : numericYear)
}

export function useLanguage() {
  const isThai = computed(() => language.value === 'th')

  function setLanguage(value: AppLanguage) {
    language.value = value
    document.documentElement.lang = value
  }

  return { language, isThai, setLanguage }
}
