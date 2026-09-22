<script setup lang="ts">
import { ref } from 'vue'

import { useLanguage } from '@/composables/useLanguage'
import type { StudentTableItem } from '@/types/student'

defineProps<{
  student: StudentTableItem
  isSaving: boolean
  error: string
}>()

const emit = defineEmits<{
  close: []
  confirm: [status: 'Resigned' | 'Dismissed']
}>()

const { t } = useLanguage()
const selectedStatus = ref<'Resigned' | 'Dismissed' | ''>('')
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="student-exit-title"
  >
    <section class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl sm:p-8">
      <h2 id="student-exit-title" class="text-xl font-bold text-slate-900">
        {{ t('dashboard.studentExitTitle') }}
      </h2>
      <p class="mt-4 text-sm leading-6 text-slate-600">
        {{ t('dashboard.studentExitConfirm', { name: `${student.name} (${student.studentId})` }) }}
      </p>

      <fieldset class="mt-6 space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4">
        <label class="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            class="size-4 rounded accent-red-600"
            :checked="selectedStatus === 'Resigned'"
            @change="selectedStatus = selectedStatus === 'Resigned' ? '' : 'Resigned'"
          />
          {{ t('dashboard.resigned') }}
        </label>
        <label class="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            class="size-4 rounded accent-red-600"
            :checked="selectedStatus === 'Dismissed'"
            @change="selectedStatus = selectedStatus === 'Dismissed' ? '' : 'Dismissed'"
          />
          {{ t('dashboard.dismissed') }}
        </label>
      </fieldset>

      <p v-if="error" class="mt-3 text-xs text-red-600">{{ error }}</p>

      <div class="mt-7 flex justify-end gap-3">
        <button
          type="button"
          class="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          :disabled="isSaving"
          @click="emit('close')"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="rounded-xl bg-[#8b2a23] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#75221d] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          :disabled="!selectedStatus || isSaving"
          @click="selectedStatus && emit('confirm', selectedStatus)"
        >
          {{ t('common.confirm') }}
        </button>
      </div>
    </section>
  </div>
</template>
