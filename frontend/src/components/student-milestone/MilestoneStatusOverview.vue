<script setup lang="ts">
import { computed } from 'vue'

import type { StudentMilestone } from '@/types/milestone'
import { milestoneStatusColor } from '@/utils/milestone-status'

const props = defineProps<{
  milestones: StudentMilestone[]
}>()

const orderedMilestones = computed(() =>
  [...props.milestones].sort((first, second) => first.sequenceOrder - second.sequenceOrder),
)
</script>

<template>
  <nav
    class="flex w-full flex-nowrap justify-start gap-1 overflow-hidden sm:flex-wrap sm:justify-end sm:gap-1.5 sm:overflow-visible"
    aria-label="Milestone status overview"
  >
    <span
      v-for="(milestone, index) in orderedMilestones"
      :key="milestone.milestoneId"
      class="flex aspect-square max-w-7 min-w-0 flex-1 items-center justify-center rounded-full text-[10px] font-semibold shadow-sm sm:size-6 sm:flex-none sm:text-xs sm:shadow-none"
      :class="milestoneStatusColor(milestone.status)"
      :aria-label="`Milestone ${index + 1}: ${milestone.status}`"
    >
      {{ index + 1 }}
    </span>
  </nav>
</template>
