import { computed, ref } from 'vue'
import { translate, type AppLanguage, type TranslationKey } from '@/lang'

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

  function t(key: TranslationKey, params?: Record<string, string | number>) {
    return translate(language.value, key, params)
  }

  return { language, isThai, setLanguage, t }
}
