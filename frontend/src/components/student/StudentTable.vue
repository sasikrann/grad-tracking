<script setup lang="ts">
import type { StudentTableItem } from '@/types/student'

withDefaults(defineProps<{
  students: StudentTableItem[]
  isLoading: boolean
  error: string
  useDoctoralLabel?: boolean
}>(), {
  useDoctoralLabel: false,
})

defineEmits<{
  view: [studentId: string]
}>()
</script>

<template>
  <div class="mt-6 overflow-x-auto">
    <table class="w-full min-w-225 table-fixed border-collapse text-left">
      <thead>
        <tr class="border-b border-[#dddddd] text-xs">
          <th class="w-[25%] pb-3 font-semibold">Student</th>
          <th class="w-[13%] pb-3 font-semibold">Program</th>
          <th class="w-[10%] -translate-x-8 pb-3 text-center font-semibold">Plan</th>
          <th class="w-[10%] pb-3 font-semibold">Semester</th>
          <th class="w-[10%] pb-3 text-center font-semibold">Year</th>
          <th class="w-[22%] pb-3 text-center font-semibold">Progress</th>
          <th class="w-[14%] pb-3 text-center font-semibold">Status</th>
          <th class="w-[8%] pb-3 text-center font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="student in students"
          :key="student.studentId"
          class="h-14.5 border-b border-[#dddddd]"
        >
          <td>
            <div class="flex items-center gap-3 pl-1">
              <div
                class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f7eaea] text-[#a13a34]"
              >
                <svg
                  class="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  aria-hidden="true"
                >
                  <path d="m3 9 9-4 9 4-9 4-9-4Z" />
                  <path d="M7 11v4.5c2.7 2 7.3 2 10 0V11M21 9v6" />
                </svg>
              </div>
              <div class="leading-tight">
                <p class="text-sm font-semibold">{{ student.name }}</p>
                <p class="mt-1 text-xs text-[#858585]">{{ student.studentId }}</p>
              </div>
            </div>
          </td>
          <td>
            <div class="flex flex-col items-start gap-1">
              <span
                class="rounded-md border border-[#dedede] px-2 py-0.5 text-xs font-semibold leading-none"
              >
                {{ useDoctoralLabel && student.degree === 'Ph. D.' ? 'Doctoral' : student.degree }}
              </span>
              <span
                class="min-w-12 rounded-md border border-[#dedede] px-2 py-0.5 text-center text-xs font-semibold leading-none"
              >
                {{ student.program }}
              </span>
            </div>
          </td>
          <td class="-translate-x-8 text-center">
            <span class="inline-flex min-w-12 justify-center px-3 py-0.5 text-xs leading-none">
              {{ student.educationPlan || '-' }}
            </span>
          </td>
          <td>
            <span
              class="inline-flex min-w-12 justify-center px-3 py-0.5 text-xs leading-none"
            >
              {{ student.semester }}
            </span>
          </td>
          <td class="text-center">
            <span
              class="inline-flex min-w-14 justify-center px-3 py-0.5 text-xs leading-none"
            >
              {{ student.year }}
            </span>
          </td>
          <td>
            <div class="flex items-center justify-center gap-1">
              <div class="h-2 w-28 overflow-hidden rounded-full bg-[#f7c9cf]">
                <div
                  class="h-full rounded-full bg-[#d50012]"
                  :style="{ width: `${student.progress}%` }"
                ></div>
              </div>
              <span class="text-xs font-semibold">{{ student.progress }}%</span>
            </div>
          </td>
          <td class="text-center">
            <span
              class="inline-flex min-w-20.5 justify-center rounded-xl px-3 py-1 text-xs font-semibold text-white"
              :class="student.status === 'Overdue' ? 'bg-[#d90012]' : 'bg-[#ffb51b]'"
            >
              {{ student.status }}
            </span>
          </td>
          <td class="text-center">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-md px-1 py-2 text-xs font-semibold text-sky-500 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-300"
              :aria-label="`View ${student.name}`"
              @click="$emit('view', student.studentId)"
            >
              <svg
                class="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
              View
            </button>
          </td>
        </tr>
        <tr v-if="isLoading">
          <td colspan="8" class="py-14 text-center text-[#777]">Loading students...</td>
        </tr>
        <tr v-else-if="error">
          <td colspan="8" class="py-14 text-center text-[#b42318]">
            {{ error }} Please make sure the backend is running.
          </td>
        </tr>
        <tr v-else-if="students.length === 0">
          <td colspan="8" class="py-14 text-center text-[#777]">
            No students match the selected filters.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
