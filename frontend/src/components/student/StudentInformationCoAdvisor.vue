<script setup lang="ts">
defineProps<{
  coAdvisors: Array<{ advisorId: string; fullName: string; email: string }>
}>()
</script>

<template>
  <section class="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div class="flex items-center gap-3">
      <div class="flex size-10 items-center justify-center rounded-lg bg-[#f7e9e8] text-[#8b2a23]">
        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="text-base font-semibold">Co-advisor Information</h2>
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Optional</span>
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
        class="rounded-lg border border-slate-200 bg-[#faf7f7] p-4"
      >
        <p class="text-xs text-slate-500">
          Current Co-advisor{{ coAdvisors.length > 1 ? ` ${index + 1}` : '' }}
        </p>
        <p class="mt-1 text-sm font-semibold text-slate-900">{{ coAdvisor.fullName }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ coAdvisor.email }}</p>
      </div>
    </div>
    <div v-else class="mt-4 rounded-lg border border-slate-200 bg-[#faf7f7] p-4">
      <p class="text-xs text-slate-500">Current Co-advisor</p>
      <p class="mt-1 text-sm text-slate-500">
        Select a co-advisor from the Appoint an Advisor milestone.
      </p>
    </div>
  </section>
</template>
