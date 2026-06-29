<script setup lang="ts">
defineOptions({ name: 'StudentMilestoneProgress' })

defineProps<{
  completedCount: number
  totalCount: number
  percentage: number
}>()
</script>

<template>
  <section
    class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
  >
    <div class="flex items-end justify-between gap-4">
      <div>
        <h2 class="text-base font-semibold text-black">Overall Progress</h2>
        <p class="mt-0.5 text-sm text-slate-500">
          {{ completedCount }} of {{ totalCount }} milestones completed
        </p>
      </div>
      <p class="text-base font-semibold text-[#8a2b25]">{{ percentage }}%</p>
    </div>

    <div class="mt-3 h-3 overflow-hidden rounded-full bg-[#efd5d9]">
      <div
        class="h-full rounded-full bg-[#8a2b25] transition-all duration-300"
        :style="{ width: `${percentage}%` }"
      ></div>
    </div>
  </section>
</template>
