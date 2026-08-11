<script setup lang="ts">
import type { StudentTableItem } from '@/types/student'
import { useLanguage } from '@/composables/useLanguage'

const { t } = useLanguage()

withDefaults(
  defineProps<{
    students: StudentTableItem[]
    isLoading: boolean
    error: string
    useDoctoralLabel?: boolean
    buddhistYear?: boolean
  }>(),
  {
    useDoctoralLabel: false,
    buddhistYear: false,
  },
)

defineEmits<{
  view: [studentId: string]
}>()

function displayYear(year: string) {
  const numericYear = Number(year)
  return Number.isFinite(numericYear) ? String(numericYear + 543) : year
}

function statusLabel(status: StudentTableItem['status']) {
  if (status === 'Graduate') return t('dashboard.graduate')
  if (status === 'Overdue') return t('dashboard.overdue')
  return t('dashboard.onTrack')
}
</script>

<template>
  <div class="mt-6 overflow-x-auto">
    <table class="w-full min-w-225 table-fixed border-collapse text-left">
      <thead>
        <tr class="border-b border-[#dddddd] text-xs">
          <th class="w-[25%] pt-1 pb-3 leading-5 font-semibold">{{ t('student.student') }}</th>
          <th class="w-[13%] pt-1 pb-3 text-center leading-5 font-semibold">{{ t('common.program') }}</th>
          <th class="w-[10%] -translate-x-2 pt-1 pb-3 text-center leading-5 font-semibold">{{ t('common.plan') }}</th>
          <th class="w-[10%] pt-1 pb-3 leading-5 font-semibold">{{ t('common.semester') }}</th>
          <th class="w-[10%] pt-1 pb-3 text-center leading-5 font-semibold">{{ t('common.enrollmentYear') }}</th>
          <th class="w-[22%] pt-1 pb-3 text-center leading-5 font-semibold">{{ t('student.progress') }}</th>
          <th class="w-[14%] pt-1 pb-3 text-center leading-5 font-semibold">{{ t('common.status') }}</th>
          <th class="w-[8%] pt-1 pb-3 text-center leading-5 font-semibold">{{ t('common.actions') }}</th>
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
                <p class="text-sm font-normal">{{ student.name }}</p>
                <p class="mt-1 text-xs text-[#858585]">{{ student.studentId }}</p>
              </div>
            </div>
          </td>
          <td class="text-center">
            <div class="inline-flex flex-col items-center gap-1">
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
          <td class="-translate-x-2 text-center">
            <span class="inline-flex min-w-12 justify-center px-3 py-0.5 text-xs leading-none">
              {{ student.educationPlan || '-' }}
            </span>
          </td>
          <td>
            <span class="inline-flex min-w-12 justify-center px-3 py-0.5 text-xs leading-none">
              {{ student.semester }}
            </span>
          </td>
          <td class="text-center">
            <span class="inline-flex min-w-14 justify-center px-3 py-0.5 text-xs leading-none">
              {{ buddhistYear ? displayYear(student.year) : student.year }}
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
              :class="
                student.status === 'Graduate'
                  ? 'bg-[#49b866]'
                  : student.status === 'Overdue'
                    ? 'bg-[#d90012]'
                    : 'bg-[#ffb51b]'
              "
            >
              {{ statusLabel(student.status) }}
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
              {{ t('common.view') }}
            </button>
          </td>
        </tr>
        <tr v-if="isLoading">
          <td colspan="8" class="py-14 text-center text-[#777]">{{ t('common.loading') }}</td>
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
