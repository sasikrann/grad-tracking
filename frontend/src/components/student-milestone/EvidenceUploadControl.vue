<script setup lang="ts">
import { ref } from 'vue'

import { useLanguage } from '@/composables/useLanguage'

defineProps<{
  uploading?: boolean
  disabled?: boolean
  ariaDisabled?: boolean
  fileName?: string
}>()

const emit = defineEmits<{ select: [file: File] }>()
const { t } = useLanguage()
const input = ref<HTMLInputElement | null>(null)
const acceptedTypes = new Set(['image/png', 'image/jpeg', 'application/pdf'])

function selectFile(event: Event) {
  const element = event.target as HTMLInputElement
  const file = element.files?.[0]
  if (file && acceptedTypes.has(file.type)) emit('select', file)
  element.value = ''
}
</script>

<template>
  <div class="flex min-w-0 flex-wrap items-center gap-3">
    <input
      ref="input"
      class="hidden"
      type="file"
      accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
      @change="selectFile"
    />
    <button
      type="button"
      class="inline-flex h-7 shrink-0 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-black shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      :aria-disabled="ariaDisabled || uploading"
      :disabled="disabled || uploading"
      @click="input?.click()"
    >
      <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M12 3v12M7 8l5-5 5 5" />
        <path d="M5 15v4h14v-4" />
      </svg>
      {{ uploading ? t('studentPortal.uploadingEvidence') : t('studentPortal.uploadEvidence') }}
    </button>
    <p class="min-w-0 break-all text-[11px] text-amber-700">
      {{ fileName || t('studentPortal.evidenceFileHelp') }}
    </p>
  </div>
</template>
