<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import MilestoneStatusOverview from '@/components/student-milestone/MilestoneStatusOverview.vue'
import StudentMilestoneCard from '@/components/student-milestone/StudentMilestoneCard.vue'
import StudentMilestoneProgress from '@/components/student-milestone/StudentMilestoneProgress.vue'
import {
  extendStudentStudyPeriod,
  getStudent,
  getStudentMilestones,
  type StudentDetail,
} from '@/services/students.api'
import type { StudentMilestone } from '@/types/milestone'
import { useLanguage } from '@/composables/useLanguage'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
const { t } = useLanguage()

const route = useRoute()

const studentId = computed(() => String(route.params.studentId ?? ''))
const studentName = ref('')
const milestones = ref<StudentMilestone[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const student = ref<StudentDetail | null>(null)
const isExtending = ref(false)

const canExtendStudyPeriod = computed(() => {
  if (!student.value || student.value.studyExtensionGranted) return false
  if (student.value.graduationSemester && student.value.graduationAcademicYear) return false
  const currentYear = new Date().getFullYear()
  const maximumStudyYears = student.value.degreeLevel === 'Doctoral' ? 5 : 4
  return (
    currentYear > student.value.enrollmentAcademicYear + 2 &&
    currentYear <= student.value.enrollmentAcademicYear + maximumStudyYears
  )
})

const completedCount = computed(
  () =>
    milestones.value.filter((milestone) => ['Approved', 'Completed'].includes(milestone.status))
      .length,
)

const progressPercentage = computed(() => {
  if (!milestones.value.length) return 0
  return Math.round((completedCount.value / milestones.value.length) * 100)
})

async function loadMilestones({ silent = false } = {}) {
  if (!silent) isLoading.value = true
  if (!silent) errorMessage.value = ''

  try {
    const [result, studentResult] = await Promise.all([
      getStudentMilestones(studentId.value),
      getStudent(studentId.value),
    ])
    studentName.value = result.student.studentName
    student.value = studentResult
    milestones.value = result.milestones
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Unable to load student milestones'
  } finally {
    if (!silent) isLoading.value = false
  }
}

async function extendStudyPeriod() {
  if (!canExtendStudyPeriod.value || isExtending.value || !student.value) return
  isExtending.value = true
  try {
    await extendStudentStudyPeriod(studentId.value)
    student.value.studyExtensionGranted = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to extend study period'
  } finally {
    isExtending.value = false
  }
}

onMounted(loadMilestones)
useAutoRefresh(() => loadMilestones({ silent: true }), {
  canRefresh: () => !isExtending.value,
})
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-3 pt-3 pb-4 font-sans text-slate-900 sm:px-6 sm:py-6 xl:px-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-black sm:text-3xl">
          {{ t('milestone.milestones') }}
        </h1>
        <p class="text-xs text-slate-500 sm:mt-1 sm:text-sm">
          {{ t('milestone.studentViewOnly') }}
        </p>
      </div>

      <div
        class="flex w-full flex-col gap-3 rounded-xl border border-[#ead7d5] bg-white p-3 shadow-[0_3px_10px_rgba(88,39,35,0.08)] sm:w-auto sm:items-end sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"
      >
        <div v-if="studentName" class="flex w-full items-center justify-between gap-2 sm:w-auto">
          <div
            class="flex min-w-0 items-center gap-2.5 sm:rounded-lg sm:border sm:border-[#ead7d5] sm:bg-white sm:px-3 sm:py-2 sm:shadow-sm"
          >
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f7e7e5] text-[#8a2b25] sm:hidden"
            >
              <svg
                class="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                aria-hidden="true"
              >
                <path d="m3 9 9-4 9 4-9 4-9-4Z" />
                <path d="M7 11v4.5c2.7 2 7.3 2 10 0V11" />
              </svg>
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-semibold text-[#3b2f2e]">{{
                studentName
              }}</span>
              <span class="mt-0.5 block text-[11px] font-medium text-[#9a4a44] sm:hidden">{{
                studentId
              }}</span>
            </span>
            <span
              class="hidden rounded-md bg-[#f5e6e5] px-2 py-0.5 text-xs font-medium text-[#8a2b25] sm:inline"
            >
              {{ studentId }}
            </span>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg border border-[#d9b9b6] bg-[#8a2b25] px-2.5 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#76231e] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            :disabled="!canExtendStudyPeriod || isExtending"
            @click="extendStudyPeriod"
          >
            {{
              student?.studyExtensionGranted
                ? t('student.studyPeriodExtended')
                : t('student.extendStudyPeriod')
            }}
          </button>
        </div>
        <StudentMilestoneProgress
          embedded
          class="w-full sm:hidden"
          :completed-count="completedCount"
          :total-count="milestones.length"
          :percentage="progressPercentage"
        />
        <div class="w-full border-t border-slate-100 pt-2.5 sm:border-0 sm:pt-0">
          <MilestoneStatusOverview :milestones="milestones" />
        </div>
      </div>
    </header>

    <p v-if="errorMessage" class="mt-4 text-sm text-red-600" role="alert">
      {{ errorMessage }}
    </p>

    <div v-if="isLoading" class="mt-5 rounded-lg bg-white px-5 py-4 text-sm text-slate-500">
      {{ t('milestone.loading') }}
    </div>

    <template v-else>
      <StudentMilestoneProgress
        class="mt-5 hidden sm:block"
        :completed-count="completedCount"
        :total-count="milestones.length"
        :percentage="progressPercentage"
      />

      <div v-if="milestones.length" class="relative mt-4 space-y-4 pb-10 sm:mt-5">
        <div
          v-if="milestones.length > 1"
          class="absolute bottom-3 left-3 top-3 w-px bg-slate-200 md:left-4"
          aria-hidden="true"
        ></div>

        <StudentMilestoneCard
          v-for="(milestone, index) in milestones"
          :key="milestone.milestoneId"
          :milestone="milestone"
          :index="index + 1"
          :current-graduation-semester="student?.graduationSemester"
          :current-graduation-academic-year="student?.graduationAcademicYear"
          mobile-collapsible
          readonly
        />
      </div>

      <section
        v-else
        class="mt-5 rounded-lg border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500"
      >
        No milestones are currently assigned.
      </section>
    </template>
  </div>
</template>
