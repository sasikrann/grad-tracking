<script setup lang="ts">
export interface MilestoneBreakdownItem {
  name: string
  completed: number
  inProgress: number
  approved: number
}

defineProps<{
  milestones: MilestoneBreakdownItem[]
}>()

const totalFor = (milestone: MilestoneBreakdownItem) =>
  milestone.completed + milestone.inProgress + milestone.approved

const segmentWidth = (value: number, milestone: MilestoneBreakdownItem) => {
  const total = totalFor(milestone)
  return total === 0 ? '0%' : `${(value / total) * 100}%`
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[760px] border-collapse text-sm">
      <thead>
        <tr class="border-b border-slate-200 text-left text-xs font-semibold text-slate-900">
          <th class="w-[26%] px-3 py-3">Milestone</th>
          <th class="w-[19%] px-3 py-3 text-center">
            <span class="inline-flex items-center gap-2">
              <span class="size-3 rounded-full bg-[#48b96b]"></span>
              Completed
            </span>
          </th>
          <th class="w-[19%] px-3 py-3 text-center">
            <span class="inline-flex items-center gap-2">
              <span class="size-3 rounded-full bg-[#fbbf3f]"></span>
              In Progress
            </span>
          </th>
          <th class="w-[19%] px-3 py-3 text-center">
            <span class="inline-flex items-center gap-2">
              <span class="size-3 rounded-full bg-[#ef6500]"></span>
              Approved
            </span>
          </th>
          <th class="w-[10%] px-3 py-3 text-center">Total</th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="(milestone, index) in milestones"
          :key="milestone.name"
          class="border-b border-slate-200 last:border-b-0"
        >
          <td class="px-3 py-4 font-medium text-slate-900">
            {{ index + 1 }}. {{ milestone.name }}
          </td>
          <td colspan="3" class="px-3 py-3">
            <div class="grid grid-cols-3 text-center text-xs font-semibold text-slate-900">
              <span>{{ milestone.completed }}</span>
              <span>{{ milestone.inProgress }}</span>
              <span>{{ milestone.approved }}</span>
            </div>
            <div class="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100">
              <span
                class="bg-[#48b96b]"
                :style="{ width: segmentWidth(milestone.completed, milestone) }"
              ></span>
              <span
                class="bg-[#fbbf3f]"
                :style="{ width: segmentWidth(milestone.inProgress, milestone) }"
              ></span>
              <span
                class="bg-[#ef6500]"
                :style="{ width: segmentWidth(milestone.approved, milestone) }"
              ></span>
            </div>
          </td>
          <td class="px-3 py-4 text-center font-semibold text-slate-900">
            {{ totalFor(milestone) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
