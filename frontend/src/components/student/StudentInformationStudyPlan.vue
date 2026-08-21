<script setup lang="ts">
import { computed } from 'vue'

import { formatAcademicYear, useLanguage } from '@/composables/useLanguage'
import type { StudentProfile } from '@/services/student-profile.api'

const props = defineProps<{
  profile: StudentProfile
}>()
useLanguage()

const studentInitials = computed(() => {
  const names = props.profile.fullName
    .replace(/^(Mr\.?|Mrs\.?|Ms\.?|Miss|Dr\.?)\s*/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  return names
    .slice(0, 2)
    .map((name) => name.charAt(0).toUpperCase())
    .join('')
})

const studentRows = computed(() => [
  { label: 'Full-Name', value: props.profile.fullName, icon: 'user', profileField: true },
  { label: 'Student ID', value: props.profile.studentId, icon: 'id', profileField: true },
  { label: 'Program', value: props.profile.program, icon: 'cap' },
  {
    label: 'Enrollment Academic Year',
    value: formatAcademicYear(props.profile.enrollmentAcademicYear),
    icon: 'calendar',
  },
  { label: 'Enrollment Semester', value: props.profile.semester, icon: 'calendar' },
  {
    label: 'Expected Graduation Year',
    value:
      props.profile.graduationSemester && props.profile.graduationAcademicYear
        ? `${props.profile.graduationSemester}/${props.profile.graduationAcademicYear}`
        : 'Please complete the Graduate milestone.',
    icon: 'calendar',
  },
])
</script>

<template>
  <section
    class="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.06)] sm:rounded-lg sm:p-5 sm:shadow-sm"
  >
    <div class="hidden items-center gap-3 sm:flex">
      <div class="flex size-10 items-center justify-center rounded-lg bg-[#f7e9e8] text-[#8b2a23]">
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
        >
          <path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M15 3v5h5M9 13h6M9 17h6" />
        </svg>
      </div>
      <h2 class="text-base font-semibold">Study Plan Information</h2>
    </div>

    <div class="flex flex-col items-center pt-2 text-center sm:hidden">
      <div
        class="flex size-16 items-center justify-center rounded-full bg-[#65000a] text-lg font-medium text-white"
      >
        {{ studentInitials }}
      </div>
      <p class="mt-2 text-sm font-medium uppercase text-slate-600">{{ profile.fullName }}</p>
      <p class="mt-1 text-base font-medium text-slate-600">{{ profile.studentId }}</p>
    </div>

    <div class="mt-4 divide-y divide-slate-200 sm:block">
      <div
        v-for="row in studentRows"
        :key="row.label"
        class="grid-cols-[1.5rem_minmax(8.75rem,1.15fr)_minmax(0,1fr)] items-start gap-2 py-3 text-xs sm:grid-cols-[1.5rem_minmax(8rem,16rem)_1fr] sm:items-center sm:gap-3 sm:text-sm"
        :class="row.profileField ? 'hidden sm:grid' : 'grid'"
      >
        <svg
          class="mt-0.5 size-4 text-slate-400 sm:mt-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
        >
          <template v-if="row.icon === 'user'">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="8" r="4" />
          </template>
          <template v-else-if="row.icon === 'id'">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M7 10h4M7 14h6M16 10h2" />
          </template>
          <template v-else-if="row.icon === 'cap'">
            <path d="m3 8 9-4 9 4-9 4-9-4Z" />
            <path d="M7 10v5c2 2 8 2 10 0v-5" />
          </template>
          <template v-else>
            <rect x="4" y="5" width="16" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M4 11h16" />
          </template>
        </svg>
        <span class="font-semibold leading-5 text-slate-900">
          {{ row.label }}
        </span>
        <span class="min-w-0 break-words leading-5 text-slate-600">
          {{ row.value }}
        </span>
      </div>
    </div>
  </section>
</template>
