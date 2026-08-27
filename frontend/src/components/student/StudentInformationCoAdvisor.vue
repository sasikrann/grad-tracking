<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage'

const { t } = useLanguage()

defineProps<{
  coAdvisors: Array<{ advisorId: string; fullName: string; email: string }>
}>()
</script>

<template>
  <section
    class="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.06)] sm:rounded-lg sm:p-5 sm:shadow-sm"
  >
    <div class="flex items-center gap-3">
      <div class="flex size-10 items-center justify-center rounded-lg bg-[#f7e9e8] text-[#8b2a23]">
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
        >
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="text-[14px] font-semibold sm:text-base">{{ t('studentPortal.coAdvisorInformation') }}</h2>
        <span
          class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 sm:text-[11px]"
          >{{ t('common.optional') }}</span
        >
      </div>
    </div>

    <div
      v-if="coAdvisors.length"
      class="mt-4 grid gap-3"
      :class="{ 'sm:grid-cols-2': coAdvisors.length > 1 }"
    >
      <div
        v-for="(coAdvisor, index) in coAdvisors"
        :key="coAdvisor.advisorId"
        class="rounded-xl border border-[#eadedd] bg-[#faf7f7] p-3.5 sm:rounded-lg sm:p-4"
      >
        <p class="text-[11px] text-slate-500 sm:text-xs">
          {{ t('studentPortal.currentCoAdvisor') }}{{ coAdvisors.length > 1 ? ` ${index + 1}` : '' }}
        </p>
        <p class="mt-1 text-xs font-semibold text-slate-900 sm:text-sm">
          {{ coAdvisor.fullName }}
        </p>
        <p class="mt-1 break-all text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
          {{ coAdvisor.email }}
        </p>
      </div>
    </div>
    <div
      v-else
      class="mt-4 rounded-xl border border-[#eadedd] bg-[#faf7f7] p-3.5 sm:rounded-lg sm:p-4"
    >
      <p class="text-[11px] text-slate-500 sm:text-xs">{{ t('studentPortal.currentCoAdvisor') }}</p>
      <p class="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
        {{ t('studentPortal.selectCoAdvisorHelp') }}
      </p>
    </div>
  </section>
</template>
