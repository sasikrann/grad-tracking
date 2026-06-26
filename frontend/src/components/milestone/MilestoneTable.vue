<!-- Component ตารางสำหรับแสดงรายการ Milestone ในหน้า Milestone Management -->
<script setup lang="ts">
import type { Milestone } from '@/types/milestone'

defineProps<{
  milestones: Milestone[]
  isLoading: boolean
}>()

defineEmits<{
  edit: [milestone: Milestone]
  remove: [milestoneId: string]
  setEnabled: [milestone: Milestone, isEnabled: boolean]
  move: [milestoneId: string, direction: 'up' | 'down']
}>()

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}
</script>

<template>
  <div class="mt-5 overflow-x-auto">
    <table class="w-full min-w-[780px] border-collapse text-left">
      <thead>
        <tr class="border-b border-slate-200 text-xs">
          <th class="w-[10%] py-3 font-semibold">Order</th>
          <th class="w-[23%] py-3 font-semibold">Title</th>
          <th class="w-[22%] py-3 font-semibold">Description</th>
          <th class="w-[12%] py-3 text-center font-semibold">Program</th>
          <th class="w-[11%] py-3 text-center font-semibold">Semester</th>
          <th class="w-[12%] py-3 pl-4 font-semibold">Deadline</th>
          <th class="w-[10%] py-3 text-right font-semibold">Actions</th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="isLoading">
          <td colspan="7" class="py-12 text-center text-sm text-slate-500">Loading milestones...</td>
        </tr>

        <tr v-else-if="milestones.length === 0">
          <td colspan="7" class="py-12 text-center text-sm text-slate-500">No milestones configured.</td>
        </tr>

        <tr
          v-for="milestone in milestones"
          v-else
          :key="milestone.milestoneId"
          class="border-b border-slate-200 text-xs"
        >
          <td class="py-4 align-top">
            <div class="flex items-start gap-1">
              <span class="cursor-grab text-slate-400" aria-hidden="true">::</span>
              <span class="w-5 text-center font-semibold">{{ milestone.sequenceOrder }}</span>
              <div class="flex flex-col">
                <button
                  class="text-slate-400 hover:text-[#7D2923]"
                  aria-label="Move milestone up"
                  @click="$emit('move', milestone.milestoneId, 'up')"
                >
                  <svg class="size-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                    <path d="M6 2 2 8h8L6 2Z" />
                  </svg>
                </button>
                <button
                  class="text-slate-400 hover:text-[#7D2923]"
                  aria-label="Move milestone down"
                  @click="$emit('move', milestone.milestoneId, 'down')"
                >
                  <svg class="size-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                    <path d="M6 10 2 4h8l-4 6Z" />
                  </svg>
                </button>
              </div>
            </div>
          </td>

          <td class="py-4 align-top font-semibold leading-snug">{{ milestone.title }}</td>
          <td class="py-4 align-top leading-snug text-slate-500">{{ milestone.description || '-' }}</td>

          <td class="py-4 text-center align-middle">
            <span class="inline-flex min-w-20 items-center justify-center rounded-md bg-slate-100 px-3 py-1 leading-none">
              {{ milestone.degreeLevel === 'Doctoral' ? 'Ph.D' : 'Master' }}
            </span>
          </td>

          <td class="py-4 text-center align-middle">
            <span
              class="inline-flex min-w-14 items-center justify-center rounded-md border border-slate-200 px-3 py-1 leading-none"
            >
              {{ milestone.semester }}
            </span>
          </td>

          <td class="py-4 pl-4 align-middle text-slate-500">{{ formatDate(milestone.deadline) }}</td>

          <td class="py-4 align-middle">
            <div class="-mt-1 flex justify-end gap-2">
              <button
                type="button"
                class="rounded-md border px-3 py-1 text-[11px]"
                :class="
                  milestone.isEnabled
                    ? 'border-green-200 bg-green-100 text-green-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                "
                @click="$emit('setEnabled', milestone, true)"
              >
                Enable
              </button>

              <button
                type="button"
                class="rounded-md border px-3 py-1 text-[11px]"
                :class="
                  !milestone.isEnabled
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                "
                @click="$emit('setEnabled', milestone, false)"
              >
                Disable
              </button>

              <button
                type="button"
                class="rounded-md border border-slate-200 p-1.5 hover:bg-slate-50"
                aria-label="Edit milestone"
                @click="$emit('edit', milestone)"
              >
                <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                </svg>
              </button>

              <button
                type="button"
                class="rounded-md border border-red-100 p-1.5 text-red-500 hover:bg-red-50"
                aria-label="Delete milestone"
                @click="$emit('remove', milestone.milestoneId)"
              >
                <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v5M14 11v5" />
                </svg>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
