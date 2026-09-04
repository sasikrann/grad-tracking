<script setup lang="ts">
import type { StudentTableItem } from '@/types/student'
import { useLanguage } from '@/composables/useLanguage'

const { isThai, t } = useLanguage()

withDefaults(
  defineProps<{
    students: StudentTableItem[]
    isLoading: boolean
    error: string
    useDoctoralLabel?: boolean
    buddhistYear?: boolean
    colorProgramBadges?: boolean
  }>(),
  {
    useDoctoralLabel: false,
    buddhistYear: false,
    colorProgramBadges: false,
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
  if (status === 'Extended') return t('dashboard.extended')
  if (status === 'Overdue') return t('dashboard.overdue')
  return t('dashboard.onTrack')
}

function degreeLabel(degree: string) {
  if (degree === 'Ph. D.' || degree === 'Doctoral') return t('common.doctoral')
  if (degree === 'Master') return t('common.master')
  return degree
}

function planLabel(plan: string) {
  const keys: Record<
    string,
    'common.planA1' | 'common.planA2' | 'common.planB' | 'common.plan21' | 'common.plan22'
  > = {
    A1: 'common.planA1',
    A2: 'common.planA2',
    B: 'common.planB',
    '2.1': 'common.plan21',
    '2.2': 'common.plan22',
  }
  return keys[plan] ? t(keys[plan]) : plan
}
</script>

<template>
  <div class="relative mt-3 min-h-40 space-y-2 md:hidden" :aria-busy="isLoading">
    <article
      v-for="student in students"
      :key="student.studentId"
      class="rounded-lg border border-[#eeeeee] bg-white p-3 shadow-sm transition-opacity duration-150"
      :class="{ 'pointer-events-none opacity-60': isLoading }"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fde7e9] text-[#d64b59]"
          >
            <svg
              class="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="m3 9 9-4 9 4-9 4-9-4Z" />
              <path d="M7 11v4.5c2.7 2 7.3 2 10 0V11M21 9v6" />
            </svg>
          </div>
          <div class="min-w-0 leading-tight">
            <p class="truncate text-xs font-semibold">{{ student.name }}</p>
            <p class="mt-1 text-[10px] text-[#7690a5]">{{ student.studentId }}</p>
          </div>
        </div>
        <button
          type="button"
          class="flex shrink-0 items-center gap-1 py-1 text-[11px] font-semibold text-blue-600"
          @click="$emit('view', student.studentId)"
        >
          <svg
            class="size-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
          {{ t('common.viewDetails') }}
        </button>
      </div>
      <div class="mt-2 flex gap-1.5">
        <span
          class="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          :class="
            student.degree === 'Ph. D.' || student.degree === 'Doctoral'
              ? 'bg-blue-900'
              : 'bg-teal-500'
          "
          >{{ degreeLabel(student.degree) }}</span
        >
        <span class="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold">{{
          student.program
        }}</span>
        <span
          class="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          :class="
            student.status === 'Graduate'
              ? 'bg-[#49b866]'
              : student.status === 'Extended'
                ? 'bg-orange-500'
                : student.status === 'Overdue'
                  ? 'bg-[#d90012]'
                  : 'bg-[#ffb51b]'
          "
          >{{ statusLabel(student.status) }}</span
        >
      </div>
      <dl class="mt-3 grid grid-cols-[1fr_auto_1fr] gap-x-3 text-[11px]">
        <div>
          <dt class="font-medium text-[#7690a5]">{{ t('common.plan') }}</dt>
          <dd class="mt-0.5 font-medium">
            {{ student.educationPlan ? planLabel(student.educationPlan) : '-' }}
          </dd>
        </div>
        <div class="justify-self-center" :class="{ '-translate-x-8.5': !isThai }">
          <dt class="font-medium text-[#7690a5]">{{ t('common.enrollmentYear') }}</dt>
          <dd class="mt-0.5 font-medium">
            {{ buddhistYear ? displayYear(student.year) : student.year }}
          </dd>
        </div>
        <div class="justify-self-end">
          <dt class="font-medium text-[#7690a5]">{{ t('common.semester') }}</dt>
          <dd class="mt-0.5 font-medium">{{ student.semester }}</dd>
        </div>
      </dl>
      <div class="mt-3">
        <p class="mb-1 text-[11px] font-medium text-[#7690a5]">{{ t('student.progress') }}</p>
        <div class="flex items-center gap-2">
          <div class="h-2 flex-1 overflow-hidden rounded-full bg-[#f7c9cf]">
            <div
              class="h-full rounded-full bg-[#d50012]"
              :style="{ width: `${student.progress}%` }"
            ></div>
          </div>
          <span class="text-[11px] font-semibold">{{ student.progress }}%</span>
        </div>
      </div>
    </article>
    <p v-if="!isLoading && error" class="py-10 text-center text-xs text-[#b42318]">{{ error }}</p>
    <p
      v-else-if="!isLoading && students.length === 0"
      class="py-10 text-center text-xs text-[#777]"
    >
      {{ t('student.noStudents') }}
    </p>
    <div
      v-if="isLoading"
      class="absolute inset-0 z-10 flex min-h-40 items-center justify-center rounded-lg bg-white/55 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
    >
      <div
        class="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-[#777] shadow-sm"
      >
        <span
          class="size-4 animate-spin rounded-full border-2 border-[#e7c8c5] border-t-[#8b2a23]"
          aria-hidden="true"
        ></span>
        {{ t('common.loading') }}
      </div>
    </div>
  </div>

  <div class="relative mt-6 hidden min-h-36 overflow-x-auto md:block" :aria-busy="isLoading">
    <table
      class="w-full min-w-225 table-fixed border-collapse text-left transition-opacity duration-150"
      :class="{ 'pointer-events-none opacity-60': isLoading }"
    >
      <thead>
        <tr class="border-b border-[#dddddd] text-xs">
          <th class="w-[25%] pt-1 pb-3 leading-5 font-semibold">{{ t('student.student') }}</th>
          <th class="w-[13%] pt-1 pb-3 text-center leading-5 font-semibold">
            {{ t('common.program') }}
          </th>
          <th class="w-[10%] -translate-x-2 pt-1 pb-3 text-center leading-5 font-semibold">
            {{ t('common.plan') }}
          </th>
          <th
            class="w-[15%] -translate-x-2 whitespace-nowrap pt-1 pb-3 text-center leading-5 font-semibold"
          >
            {{ t('common.semester') }}
          </th>
          <th class="w-[12%] pt-1 pb-3 text-center leading-5 font-semibold">
            {{ t('common.enrollmentYear') }}
          </th>
          <th class="w-[19%] pt-1 pb-3 text-center leading-5 font-semibold">
            {{ t('student.progress') }}
          </th>
          <th class="w-[14%] pt-1 pb-3 text-center leading-5 font-semibold">
            {{ t('common.status') }}
          </th>
          <th class="w-[8%] pt-1 pb-3 text-center leading-5 font-semibold">
            {{ t('common.actions') }}
          </th>
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
                :class="
                  colorProgramBadges
                    ? student.degree === 'Ph. D.'
                      ? 'border-blue-900 bg-blue-900 text-white'
                      : 'border-teal-500 bg-teal-500 text-white'
                    : ''
                "
              >
                {{
                  isThai
                    ? degreeLabel(student.degree)
                    : useDoctoralLabel && student.degree === 'Ph. D.'
                      ? 'Doctoral'
                      : student.degree
                }}
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
              {{ student.educationPlan ? planLabel(student.educationPlan) : '-' }}
            </span>
          </td>
          <td class="-translate-x-2 text-center">
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
                  : student.status === 'Extended'
                    ? 'bg-orange-500'
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
        <tr v-if="!isLoading && error">
          <td colspan="8" class="py-14 text-center text-[#b42318]">
            {{ error }} Please make sure the backend is running.
          </td>
        </tr>
        <tr v-else-if="!isLoading && students.length === 0">
          <td colspan="8" class="py-14 text-center text-[#777]">
            {{ t('student.noStudents') }}
          </td>
        </tr>
      </tbody>
    </table>
    <div
      v-if="isLoading"
      class="absolute inset-0 z-10 flex min-h-36 items-center justify-center rounded-lg bg-white/55 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
    >
      <div
        class="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-[#777] shadow-sm"
      >
        <span
          class="size-5 animate-spin rounded-full border-2 border-[#e7c8c5] border-t-[#8b2a23]"
          aria-hidden="true"
        ></span>
        {{ t('common.loading') }}
      </div>
    </div>
  </div>
</template>
