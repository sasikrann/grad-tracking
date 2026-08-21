<script setup lang="ts">
import type { StudentProfile } from '@/services/student-profile.api'

defineProps<{ profile: StudentProfile }>()
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
      <h2 class="text-[14px] font-semibold sm:text-base">Advisor Information</h2>
    </div>

    <div class="mt-4 rounded-xl border border-[#eadedd] bg-[#faf7f7] p-3.5 sm:rounded-lg sm:p-4">
      <p class="text-[11px] text-slate-500 sm:text-xs">Current Advisor</p>
      <template v-if="profile.advisorId">
        <p class="mt-1 text-xs font-semibold text-slate-900 sm:text-sm">
          {{ profile.advisorName }}
        </p>
        <p class="mt-1 break-all text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
          {{ profile.advisorEmail }}
        </p>
      </template>
      <p v-else class="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
        Select an advisor from the Appoint an Advisor milestone.
      </p>
    </div>
  </section>
</template>
