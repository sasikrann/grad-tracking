<script setup lang="ts">
import type { Advisor } from '@/types/advisor'
import { useLanguage } from '@/composables/useLanguage'
const { t } = useLanguage()

defineProps<{
  advisors: Advisor[]
  isLoading: boolean
  error: string
}>()

const search = defineModel<string>('search', { required: true })

defineEmits<{
  status: [advisorId: string, status: Advisor['status']]
  delete: [advisorId: string]
}>()

function initials(name: string) {
  const normalizedName = name
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^(?:(?:Asst\.?\s*Prof\.?|Assoc\.?\s*Prof\.?|Prof\.?|Dr\.?)\s*)+/i, '')
    .replace(/^(?:นาย|นางสาว|นาง)\s*/, '')
    .replace(/^(?:Mr\.?|Mrs\.?|Ms\.?)\s*/i, '')
    .trim()

  const nameParts = normalizedName
    .split(/\s+/)
    .filter(Boolean)

  const firstName = nameParts[0] ?? ''
  const lastName = nameParts[nameParts.length - 1] ?? ''
  const initialNames = lastName && lastName !== firstName ? [firstName, lastName] : [firstName]

  return initialNames.map((part) => part.charAt(0).toUpperCase()).join('')
}

function assistantProfessorTitle(name: string) {
  return name.match(/^Asst\.?\s*Prof\.?/i)?.[0] ?? ''
}

function nameWithoutAssistantProfessorTitle(name: string) {
  return name.replace(/^Asst\.?\s*Prof\.?\s*/i, '')
}

function statusLabel(status: Advisor['status']) {
  return status === 'active' ? t('advisor.active') : t('advisor.inactive')
}
</script>

<template>
  <section
    class="mt-3 rounded-lg border border-[#ececec] bg-white px-2 pt-3 pb-4 shadow-[0_2px_4px_rgba(0,0,0,0.12)] sm:mt-4 sm:rounded-xl sm:px-5 sm:py-5"
  >
    <div class="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
      <div class="shrink-0">
        <h2 class="text-base font-semibold sm:text-lg">{{ t('advisor.advisor') }}</h2>
        <p class="text-xs font-medium text-[#7d7d7d] sm:font-normal sm:text-slate-500">
          {{ t('advisor.showingUsers', { count: advisors.length }) }}
        </p>
      </div>
      <label class="relative block w-full min-w-0 sm:w-80 sm:flex-none">
        <span class="sr-only">{{ t('advisor.searchPlaceholder') }}</span>
        <svg
          class="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#888] sm:left-3.5 sm:size-4 sm:text-[#cfcfcf]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          v-model="search"
          type="search"
          :placeholder="t('advisor.searchPlaceholder')"
          class="h-9 w-full rounded-lg border border-[#e7e7e7] bg-white pr-3 pl-9 text-[10px] outline-none focus:border-[#8a2b25] sm:h-8 sm:border-[#eeeeee] sm:pr-4 sm:pl-10 sm:text-xs sm:font-medium sm:text-[#333] sm:shadow-[0_2px_4px_rgba(0,0,0,0.08)] sm:placeholder:text-[#888]"
        />
      </label>
    </div>

    <div class="mt-3 space-y-2 md:hidden">
      <article
        v-for="advisor in advisors"
        :key="advisor.advisorId"
        class="rounded-lg border border-[#eeeeee] bg-white p-3 shadow-sm"
      >
        <div class="flex min-h-16 items-center gap-3">
          <span
            class="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#fde7e9] text-sm font-semibold text-[#d64b59]"
          >
            {{ initials(advisor.fullName) }}
          </span>
          <div class="min-w-0 flex-1 leading-tight">
            <p class="break-words text-sm font-semibold">
              <template v-if="assistantProfessorTitle(advisor.fullName)">
                <span class="block">{{ assistantProfessorTitle(advisor.fullName) }}</span>
                <span class="block">{{ nameWithoutAssistantProfessorTitle(advisor.fullName) }}</span>
              </template>
              <template v-else>{{ advisor.fullName }}</template>
            </p>
            <p class="mt-1 text-xs text-[#858585]">{{ advisor.advisorId }}</p>
            <p class="mt-1 truncate text-[11px] text-[#7690a5]">{{ advisor.email }}</p>
          </div>
          <div class="flex min-h-16 shrink-0 flex-col items-end justify-between">
            <button
              type="button"
              class="shrink-0 rounded-md border border-red-100 p-1.5 text-red-500 hover:bg-red-50"
              :aria-label="`${t('common.delete')} ${advisor.fullName}`"
              @click="$emit('delete', advisor.advisorId)"
            >
              <svg
                class="size-3.5"
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
            <div class="flex gap-1.5">
              <button
                v-for="status in ['active', 'inactive'] as const"
                :key="status"
                type="button"
                :disabled="advisor.status === status"
                :aria-label="`Set ${advisor.fullName} status to ${statusLabel(status)}`"
                class="min-w-14 rounded-md border px-3 py-1.5 text-[11px] font-medium disabled:cursor-default"
                :class="
                  advisor.status === status
                    ? status === 'active'
                      ? 'border-green-200 bg-green-100 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                "
                @click="$emit('status', advisor.advisorId, status)"
              >
                {{ statusLabel(status) }}
              </button>
            </div>
          </div>
        </div>
      </article>
      <p v-if="isLoading" class="py-10 text-center text-xs text-[#777]">
        {{ t('common.loading') }}
      </p>
      <p v-else-if="error" class="py-10 text-center text-xs text-[#b42318]">{{ error }}</p>
      <p v-else-if="advisors.length === 0" class="py-10 text-center text-xs text-[#777]">
        {{ t('advisor.noMatchingAdvisors') }}
      </p>
    </div>

    <div class="mt-4 hidden overflow-x-auto md:block">
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
          <tr v-for="advisor in advisors" :key="advisor.advisorId">
            <td class="w-[38%] py-3 pr-4">
              <div class="flex items-center gap-4">
                <span
                  class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f4e7e7] text-xs font-semibold text-[#a33a3a]"
                >
                  {{ initials(advisor.fullName) }}
                </span>
                <div class="leading-tight">
                  <p class="font-semibold">{{ advisor.fullName }}</p>
                  <p class="mt-1 text-xs font-normal text-[#858585]">{{ advisor.advisorId }}</p>
                </div>
              </div>
            </td>
            <td class="w-[37%] px-4 py-3 text-xs text-slate-600">
              <div class="mx-auto w-64 text-left">{{ advisor.email }}</div>
            </td>
            <td class="w-[25%] py-3 pl-4 text-right">
              <div class="ml-auto flex w-48 items-center justify-end gap-2">
                <button
                  v-for="status in ['active', 'inactive'] as const"
                  :key="status"
                  type="button"
                  :disabled="advisor.status === status"
                  :aria-label="`Set ${advisor.fullName} status to ${statusLabel(status)}`"
                  class="rounded-md border px-3 py-1 text-[11px] disabled:cursor-default"
                  :class="
                    advisor.status === status
                      ? status === 'active'
                        ? 'border-green-200 bg-green-100 text-green-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  "
                  @click="$emit('status', advisor.advisorId, status)"
                >
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
          <tr v-if="advisors.length === 0">
            <td colspan="3" class="py-10 text-center text-sm text-slate-500">
              {{ t('advisor.noMatchingAdvisors') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
