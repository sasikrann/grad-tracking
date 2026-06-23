<script setup lang="ts">
import type { LecturerStudent } from '@/types/lecturer'

defineProps<{
  students: LecturerStudent[]
  isLoading: boolean
  error: string
}>()

defineEmits<{
  view: [studentId: string]
}>()
</script>

<template>
  <div class="mt-8 overflow-x-auto">
    <table class="w-full min-w-[900px] table-fixed border-collapse text-left">
      <thead>
        <tr class="border-b border-[#dddddd] text-sm">
          <th class="w-[29%] pb-3 font-semibold">Student</th>
          <th class="w-[13%] pb-3 font-semibold">Program</th>
          <th class="w-[13%] pb-3 font-semibold">Semester</th>
          <th class="w-[23%] pb-3 font-semibold">Progress</th>
          <th class="w-[17%] pb-3 font-semibold">Status</th>
          <th class="w-[8%] pb-3 font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="student in students"
          :key="student.studentId"
          class="h-[75px] border-b border-[#dddddd]"
        >
          <td>
            <div class="flex items-center gap-5 pl-2">
              <div
                class="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#f7eaea] text-[#a13a34]"
              >
                <svg
                  class="size-7"
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
                <p class="text-base font-semibold">{{ student.name }}</p>
                <p class="mt-1 text-sm text-[#858585]">{{ student.studentId }}</p>
              </div>
            </div>
          </td>
          <td>
            <div class="flex flex-col items-start gap-1">
              <span
                class="rounded-md border border-[#dedede] px-2 py-0.5 text-sm font-semibold leading-none"
              >
                {{ student.degree }}
              </span>
              <span
                class="min-w-14 rounded-md border border-[#dedede] px-2 py-0.5 text-center text-sm font-semibold leading-none"
              >
                {{ student.program }}
              </span>
            </div>
          </td>
          <td>
            <span
              class="inline-flex min-w-14 justify-center rounded-md border border-[#dedede] px-3 py-0.5 text-sm leading-none"
            >
              {{ student.semester }}
            </span>
          </td>
          <td>
            <div class="flex items-center gap-1">
              <div class="h-2.5 w-32 overflow-hidden rounded-full bg-[#f7c9cf]">
                <div
                  class="h-full rounded-full bg-[#d50012]"
                  :style="{ width: `${student.progress}%` }"
                ></div>
              </div>
              <span class="text-sm font-semibold">{{ student.progress }}%</span>
            </div>
          </td>
          <td>
            <span
              class="inline-flex min-w-[105px] justify-center rounded-xl px-4 py-1 text-sm font-semibold text-white"
              :class="student.status === 'Overdue' ? 'bg-[#d90012]' : 'bg-[#ffb51b]'"
            >
              {{ student.status }}
            </span>
          </td>
          <td>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-md px-1 py-2 text-sm font-semibold hover:text-[#8a2b25] focus:outline-none focus:ring-2 focus:ring-[#8a2b25]/30"
              :aria-label="`View ${student.name}`"
              @click="$emit('view', student.studentId)"
            >
              <svg
                class="size-5"
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
          <td colspan="6" class="py-14 text-center text-[#777]">Loading students...</td>
        </tr>
        <tr v-else-if="error">
          <td colspan="6" class="py-14 text-center text-[#b42318]">
            {{ error }} Please make sure the backend is running.
          </td>
        </tr>
        <tr v-else-if="students.length === 0">
          <td colspan="6" class="py-14 text-center text-[#777]">
            No students match the selected filters.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
