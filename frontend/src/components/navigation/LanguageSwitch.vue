<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage'

defineProps<{ enabled: boolean }>()
const { language, setLanguage, t } = useLanguage()
</script>

<template>
  <div class="mb-2 flex justify-end" :class="{ 'opacity-55': !enabled }">
    <div
      class="grid w-24 grid-cols-2 rounded-md bg-black/15 p-0.5"
      role="group"
      :aria-label="t('language.label')"
    >
      <button
        v-for="option in (['en', 'th'] as const)"
        :key="option"
        type="button"
        class="rounded px-2 py-1 text-[10px] font-semibold transition-colors"
        :class="language === option ? 'bg-white text-[#7D2923] shadow-sm' : 'text-white/75'"
        :disabled="!enabled"
        :aria-pressed="language === option"
        :title="enabled ? undefined : t('language.adminOnly')"
        @click="enabled && setLanguage(option)"
      >
        {{ option === 'en' ? t('language.english') : t('language.thai') }}
      </button>
    </div>
  </div>
</template>
