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
  () => milestones.value.filter((milestone) => ['Approved', 'Completed'].includes(milestone.status)).length,
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
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load student milestones'
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
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-6 xl:px-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-black">{{ t('milestone.milestones') }}</h1>
        <p class="mt-1 text-sm text-slate-500">
          You have permission to view students' milestones only.
        </p>
      </div>

      <div class="flex flex-col items-end gap-2">
        <div
          v-if="studentName"
          class="flex flex-wrap items-center justify-end gap-2"
        >
          <div
            class="inline-flex items-center gap-2 rounded-lg border border-[#ead7d5] bg-white px-3 py-2 text-sm shadow-sm"
          >
            <span class="font-medium text-[#3b2f2e]">{{ studentName }}</span>
            <span class="rounded-md bg-[#f5e6e5] px-2 py-0.5 text-xs font-medium text-[#8a2b25]">
              {{ studentId }}
            </span>
          </div>
          <button
            type="button"
            class="rounded-lg border border-[#ead7d5] bg-[#8a2b25] px-3 py-2 text-xs font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
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
        <MilestoneStatusOverview :milestones="milestones" />
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
        class="mt-5"
        :completed-count="completedCount"
        :total-count="milestones.length"
        :percentage="progressPercentage"
      />

      <div
        v-if="milestones.length"
        class="relative mt-5 space-y-4 pb-10"
      >
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
