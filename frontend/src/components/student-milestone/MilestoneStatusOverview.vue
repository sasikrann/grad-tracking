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
  <nav class="flex flex-wrap justify-end gap-1.5" aria-label="Milestone status overview">
    <span
      v-for="(milestone, index) in orderedMilestones"
      :key="milestone.milestoneId"
      class="flex size-6 items-center justify-center rounded-full text-xs font-semibold"
      :class="milestoneStatusColor(milestone.status)"
      :aria-label="`Milestone ${index + 1}: ${milestone.status}`"
    >
      {{ index + 1 }}
    </span>
  </nav>
</template>
