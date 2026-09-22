<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import MilestoneStatusOverview from '@/components/student-milestone/MilestoneStatusOverview.vue'
import StudentMilestoneCard from '@/components/student-milestone/StudentMilestoneCard.vue'
import StudentMilestoneProgress from '@/components/student-milestone/StudentMilestoneProgress.vue'
import {
  extendStudentStudyPeriod,
  cancelStudentStudyExtension,
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
const isCancellingExtension = ref(false)
const isCancelExtensionModalOpen = ref(false)
const isCancelExtensionConfirmed = ref(false)
const cancelExtensionError = ref('')

const studyExtensionCount = computed(() => {
  const count = Number(student.value?.studyExtensionCount ?? 0)
  return Number.isFinite(count) ? Math.min(2, Math.max(0, count)) : 0
})

function isPastNormalStudyPeriod() {
  if (!student.value) return false
  const normalYears =
    student.value.degreeLevel === 'Master'
      ? 4
      : student.value.educationPlan === '2.2'
        ? 7
        : 5
  const endMonth = student.value.semester === '2' ? 11 : 4
  const endDay = student.value.semester === '2' ? 31 : 31
  const normalEnd = new Date(
    student.value.enrollmentAcademicYear + normalYears,
    endMonth,
    endDay,
    23,
    59,
    59,
  )
  return new Date() > normalEnd
}

const canExtendStudyPeriod = computed(() => {
  if (!student.value) return false
  if (student.value.graduationSemester && student.value.graduationAcademicYear) return false
  if (studyExtensionCount.value >= 2) return false
  if (student.value.studyExtensionGranted || student.value.academicStatus === 'Extended') return false
  if (student.value.canExtendStudyPeriod === true) return true
  return student.value.academicStatus === 'Overdue' || isPastNormalStudyPeriod()
})

const extensionButtonLabel = computed(() => {
  if (!student.value) return t('student.extendStudyPeriod')
  if (studyExtensionCount.value >= 2) return t('student.studyExtensionLimitReached')
  return t('student.extendStudyPeriodRound').replace(
    '{round}',
    String(studyExtensionCount.value + 1),
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
    const extension = await extendStudentStudyPeriod(studentId.value)
    student.value.studyExtensionCount = extension.studyExtensionCount
    student.value.latestStudyExtensionNumber = extension.extensionNumber
    student.value.studyExtensionAcademicYear = extension.academicYear
    student.value.studyExtensionSemester = extension.semester
    student.value.studyExtensionStartsOn = extension.startsOn
    student.value.studyExtensionEndsOn = extension.endsOn
    student.value.studyExtensionGranted = true
    student.value.canExtendStudyPeriod = extension.studyExtensionCount < 2
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to extend study period'
  } finally {
    isExtending.value = false
  }
}

function openCancelExtensionModal() {
  if (!studyExtensionCount.value || isCancellingExtension.value) return
  isCancelExtensionConfirmed.value = false
  cancelExtensionError.value = ''
  isCancelExtensionModalOpen.value = true
}

function closeCancelExtensionModal() {
  if (isCancellingExtension.value) return
  isCancelExtensionModalOpen.value = false
  isCancelExtensionConfirmed.value = false
  cancelExtensionError.value = ''
}

async function confirmCancelStudyExtension() {
  if (!isCancelExtensionConfirmed.value) return
  isCancellingExtension.value = true
  cancelExtensionError.value = ''
  try {
    await cancelStudentStudyExtension(studentId.value)
    isCancelExtensionModalOpen.value = false
    await loadMilestones({ silent: true })
  } catch (error) {
    cancelExtensionError.value =
      error instanceof Error ? error.message : 'Unable to cancel study extension'
  } finally {
    isCancellingExtension.value = false
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
        class="flex w-full flex-col gap-3 rounded-xl border border-[#ead7d5] bg-white p-3 shadow-[0_3px_10px_rgba(88,39,35,0.08)] xl:w-auto xl:items-end xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none"
      >
        <div
          v-if="studentName"
          class="flex w-full flex-col items-stretch gap-0 xl:w-auto xl:flex-row xl:items-start xl:justify-between xl:gap-2"
        >
          <div
            class="flex min-w-0 items-center gap-2.5 xl:rounded-lg xl:border xl:border-[#ead7d5] xl:bg-white xl:px-3 xl:py-2 xl:shadow-sm"
          >
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f7e7e5] text-[#8a2b25] xl:hidden"
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
              <span class="mt-0.5 block text-[11px] font-medium text-[#9a4a44] xl:hidden">{{
                studentId
              }}</span>
            </span>
            <span
              class="hidden rounded-md bg-[#f5e6e5] px-2 py-0.5 text-xs font-medium text-[#8a2b25] xl:inline"
            >
              {{ studentId }}
            </span>
          </div>
          <div class="mt-2 flex w-full flex-row items-start gap-2 xl:mt-0 xl:w-auto">
            <button
              v-if="studyExtensionCount"
              type="button"
              class="min-w-0 flex-1 rounded-lg border border-red-200 bg-white px-2 py-2 text-[10px] font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto xl:flex-none xl:px-3 xl:text-[11px]"
              :disabled="isCancellingExtension || isExtending"
              @click="openCancelExtensionModal"
            >
              {{
                t('student.cancelStudyExtension').replace(
                  '{round}',
                  String(student?.latestStudyExtensionNumber ?? studyExtensionCount),
                )
              }}
            </button>
            <div class="relative flex min-w-0 flex-1 flex-col items-stretch xl:w-auto xl:flex-none">
              <span class="absolute -top-4 right-0 text-right text-[9px] font-medium leading-tight whitespace-nowrap text-slate-500 xl:text-[10px]">
                {{ t('student.studyExtensionUsage').replace('{count}', String(studyExtensionCount)) }}
              </span>
              <button
                type="button"
                class="w-full rounded-lg border border-[#d9b9b6] bg-[#8a2b25] px-2 py-2 text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#76231e] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500 xl:w-auto xl:px-2.5 xl:text-[11px]"
                :disabled="!canExtendStudyPeriod || isExtending"
                @click="extendStudyPeriod"
              >
                {{ extensionButtonLabel }}
              </button>
            </div>
          </div>
        </div>
        <StudentMilestoneProgress
          embedded
          class="w-full xl:hidden"
          :completed-count="completedCount"
          :total-count="milestones.length"
          :percentage="progressPercentage"
        />
        <div class="w-full border-t border-slate-100 pt-2.5 xl:w-auto xl:self-end xl:border-0 xl:pt-0">
          <MilestoneStatusOverview class="admin-milestone-status" :milestones="milestones" />
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
        class="mt-5 hidden xl:block"
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

    <Teleport to="body">
      <div
        v-if="isCancelExtensionModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-extension-title"
        @click.self="closeCancelExtensionModal"
      >
        <section class="w-full max-w-md rounded-2xl border border-[#ead7d5] bg-white p-5 shadow-2xl sm:p-6">
          <h2 id="cancel-extension-title" class="text-lg font-bold text-slate-900">
            {{ t('student.cancelStudyExtensionModalTitle') }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-600">
            {{
              t('student.cancelStudyExtensionConfirmation')
                .replace(
                  '{round}',
                  String(student?.latestStudyExtensionNumber ?? studyExtensionCount),
                )
                .replace('{name}', student?.fullName ?? studentName)
                .replace('{studentId}', studentId)
            }}
          </p>

          <label
            class="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#ead7d5] bg-[#fff8f7] p-3.5 text-sm text-slate-700"
          >
            <input
              v-model="isCancelExtensionConfirmed"
              type="checkbox"
              class="mt-0.5 size-4 shrink-0 accent-[#8a2b25]"
              :disabled="isCancellingExtension"
            />
            <span>{{ t('student.cancelStudyExtensionCheckbox') }}</span>
          </label>
          <p v-if="cancelExtensionError" class="mt-2 text-xs text-red-600" role="alert">
            {{ cancelExtensionError }}
          </p>

          <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
              :disabled="isCancellingExtension"
              @click="closeCancelExtensionModal"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              class="w-full rounded-lg bg-[#8a2b25] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#76231e] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 sm:w-auto"
              :disabled="isCancellingExtension || !isCancelExtensionConfirmed"
              @click="confirmCancelStudyExtension"
            >
              {{ t('student.confirmCancelStudyExtension') }}
            </button>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@media (min-width: 768px) and (max-width: 1279px) {
  :deep(.admin-milestone-status) {
    justify-content: space-between;
    gap: 0.5rem;
  }

  :deep(.admin-milestone-status > span) {
    width: 2.25rem;
    height: 2.25rem;
    max-width: none;
    flex: 0 0 2.25rem;
    font-size: 0.75rem;
  }
}
</style>
