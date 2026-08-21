<script setup lang="ts">
defineOptions({ name: 'StudentMilestoneProgress' })

withDefaults(
  defineProps<{
    completedCount: number
    totalCount: number
    percentage: number
    embedded?: boolean
  }>(),
  { embedded: false },
)
</script>

<template>
  <section
    :class="
      embedded
        ? 'border-t border-slate-100 pt-3'
        : 'rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5'
    "
  >
    <div class="flex items-end justify-between gap-4">
      <div>
        <h2 :class="embedded ? 'text-sm' : 'text-base'" class="font-semibold text-black">
          Overall Progress
        </h2>
        <p :class="embedded ? 'text-xs' : 'text-sm'" class="mt-0.5 text-slate-500">
          {{ completedCount }} of {{ totalCount }} milestones completed
        </p>
      </div>
      <p class="font-semibold text-[#8a2b25]" :class="embedded ? 'text-sm' : 'text-base'">
        {{ percentage }}%
      </p>
    </div>

    <div
      class="overflow-hidden rounded-full bg-[#efd5d9]"
      :class="embedded ? 'mt-2 h-2' : 'mt-3 h-3'"
    >
      <div
        class="h-full rounded-full bg-[#8a2b25] transition-all duration-300"
        :style="{ width: `${percentage}%` }"
      ></div>
    </div>
  </section>
</template>
