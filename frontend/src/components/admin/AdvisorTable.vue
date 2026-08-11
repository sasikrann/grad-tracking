<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Advisor } from '@/types/advisor'
import { useLanguage } from '@/composables/useLanguage'
const { t } = useLanguage()

const props = defineProps<{
  advisors: Advisor[]
  isLoading: boolean
  error: string
}>()

const search = ref('')
const filteredAdvisors = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  if (!keyword) return props.advisors
  return props.advisors.filter((advisor) =>
    advisor.fullName.toLocaleLowerCase().includes(keyword),
  )
})

defineEmits<{
  status: [advisorId: string, status: Advisor['status']]
  delete: [advisorId: string]
}>()

function initials(name: string) {
  return name
    .replace(/^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s*/i, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function statusLabel(status: Advisor['status']) {
  return status === 'active' ? t('advisor.active') : t('advisor.inactive')
}
</script>

<template>
  <section class="mt-4 rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">{{ t('advisor.advisor') }}</h2>
        <p class="text-xs text-slate-500">{{ t('advisor.showingUsers', { count: filteredAdvisors.length }) }}</p>
      </div>
      <label class="relative block w-full sm:w-80">
        <span class="sr-only">{{ t('advisor.searchPlaceholder') }}</span>
        <svg
          class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#cfcfcf]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          v-model="search"
          type="search"
          :placeholder="t('advisor.searchPlaceholder')"
          class="h-8 w-full rounded-lg border border-[#eeeeee] bg-white pr-4 pl-10 text-xs font-medium text-[#333] shadow-[0_2px_4px_rgba(0,0,0,0.08)] outline-none placeholder:text-[#888] focus:border-[#8a2b25]"
        />
      </label>
    </div>

    <div v-if="isLoading" class="py-10 text-center text-sm text-slate-500">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="py-10 text-center text-sm text-red-600">{{ error }}</div>
    <div v-else class="mt-4 overflow-x-auto">
      <table class="min-w-full table-fixed text-left text-sm">
        <thead class="border-b border-slate-200 text-slate-900">
          <tr class="text-xs">
            <th class="w-[38%] py-3 pr-4 font-semibold">{{ t('advisor.advisor') }}</th>
            <th class="w-[37%] px-4 py-3 font-semibold">
              <div class="mx-auto w-64 text-left">{{ t('common.email') }}</div>
            </th>
            <th class="w-[25%] py-3 pl-4 font-semibold">
              <div class="ml-auto w-48 text-center">{{ t('common.status') }}</div>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="advisor in filteredAdvisors" :key="advisor.advisorId">
            <td class="w-[38%] py-3 pr-4">
              <div class="flex items-center gap-4">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f4e7e7] text-xs font-semibold text-[#a33a3a]">
                  {{ initials(advisor.fullName) }}
                </span>
                <span class="font-semibold">{{ advisor.fullName }}</span>
              </div>
            </td>
            <td class="w-[37%] px-4 py-3 text-xs text-slate-600">
              <div class="mx-auto w-64 text-left">{{ advisor.email }}</div>
            </td>
            <td class="w-[25%] py-3 pl-4 text-right">
              <div class="ml-auto flex w-48 items-center justify-end gap-2">
                <button v-for="status in (['active', 'inactive'] as const)" :key="status" type="button" :disabled="advisor.status === status" :aria-label="`Set ${advisor.fullName} status to ${statusLabel(status)}`" class="rounded-md border px-3 py-1 text-[11px] disabled:cursor-default" :class="advisor.status === status ? (status === 'active' ? 'border-green-200 bg-green-100 text-green-700' : 'border-red-200 bg-red-50 text-red-700') : 'border-slate-200 text-slate-500 hover:bg-slate-50'" @click="$emit('status', advisor.advisorId, status)">
                  {{ statusLabel(status) }}
                </button>
                <button
                  type="button"
                  class="shrink-0 rounded-md border border-red-100 p-1.5 text-red-500 hover:bg-red-50"
                  :aria-label="`${t('common.delete')} ${advisor.fullName}`"
                  @click="$emit('delete', advisor.advisorId)"
                >
                  <svg
                    class="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5M14 11v5" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="filteredAdvisors.length === 0">
            <td colspan="3" class="py-10 text-center text-sm text-slate-500">
              {{ t('advisor.noMatchingAdvisors') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
