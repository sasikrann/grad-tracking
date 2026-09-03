<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import MilestoneStatusOverview from '@/components/student-milestone/MilestoneStatusOverview.vue'
import StudentMilestoneCard from '@/components/student-milestone/StudentMilestoneCard.vue'
import StudentMilestoneProgress from '@/components/student-milestone/StudentMilestoneProgress.vue'
import { getAdvisors } from '@/services/advisors.api'
import {
  appointMyStudentAdvisors,
  getMyStudentProfile,
  type StudentProfile,
  submitMyGraduation,
} from '@/services/student-profile.api'
import {
  getMyStudentMilestones,
  removeMyMilestoneEvidence,
  uploadMyMilestoneEvidence,
} from '@/services/student-milestones.api'
import type { StudentMilestone } from '@/types/milestone'
import type { Advisor } from '@/types/advisor'
import { useLanguage } from '@/composables/useLanguage'

const { t } = useLanguage()

const milestones = ref<StudentMilestone[]>([])
const profile = ref<StudentProfile | null>(null)
const advisors = ref<Advisor[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const uploadingMilestoneId = ref<string | null>(null)
const uploadErrorMilestoneId = ref<string | null>(null)
const uploadErrorMessage = ref('')
const savingAppointmentMilestoneId = ref<string | null>(null)
const appointmentError = ref('')
const savingGraduationMilestoneId = ref<string | null>(null)
const graduationError = ref('')
const maxMilestoneEvidenceFileSize = 2 * 1024 * 1024
const notificationMessage = ref('')
let refreshTimer: ReturnType<typeof window.setInterval> | undefined
let notificationTimer: ReturnType<typeof window.setTimeout> | undefined

const completedCount = computed(
  () =>
    milestones.value.filter((milestone) => ['Approved', 'Completed'].includes(milestone.status))
      .length,
)

const progressPercentage = computed(() => {
  if (!milestones.value.length) return 0
  return Math.round((completedCount.value / milestones.value.length) * 100)
})
const hasAdvisor = computed(() => Boolean(profile.value?.advisorId))
const milestoneSubmissionLocked = computed(() =>
  ['Overdue', 'Graduate'].includes(profile.value?.academicStatus ?? ''),
)
const advisorAppointmentIndex = computed(() =>
  milestones.value.findIndex((milestone) => milestone.templateKey?.endsWith('advisor-appointment')),
)
function canUploadMilestone(milestoneId: string) {
  if (milestoneSubmissionLocked.value) return false
  if (hasAdvisor.value) return true
  const milestoneIndex = milestones.value.findIndex(
    (milestone) => milestone.milestoneId === milestoneId,
  )
  return advisorAppointmentIndex.value < 0 || milestoneIndex < advisorAppointmentIndex.value
}
const completedMilestoneIds = computed(
  () =>
    new Set(
      milestones.value
        .filter((milestone) => ['Completed', 'Approved'].includes(milestone.status))
        .map((milestone) => milestone.milestoneId),
    ),
)

function normalizeTitle(title: string) {
  return title.trim().toLowerCase()
}

function prerequisiteIdsFor(milestone: StudentMilestone) {
  if (milestone.prerequisiteMilestoneIds?.length) {
    const assignedMilestoneIds = new Set(
      milestones.value.map((assignedMilestone) => assignedMilestone.milestoneId),
    )
    return milestone.prerequisiteMilestoneIds.filter((milestoneId) =>
      assignedMilestoneIds.has(milestoneId),
    )
  }

  const template = milestones.value.find(
    (candidate) => normalizeTitle(candidate.title) === normalizeTitle(milestone.title),
  )
  if (!template?.prerequisiteMilestoneIds?.length) return []

  return template.prerequisiteMilestoneIds.flatMap((templateId) => {
    const prerequisiteTemplate = milestones.value.find(
      (candidate) => candidate.milestoneId === templateId,
    )
    if (!prerequisiteTemplate) return []

    const assignedMilestone = milestones.value.find(
      (candidate) => normalizeTitle(candidate.title) === normalizeTitle(prerequisiteTemplate.title),
    )
    return assignedMilestone ? [assignedMilestone.milestoneId] : []
  })
}

function formatMilestoneNumbers(milestoneIds: string[]) {
  const numbers = milestoneIds
    .map(
      (milestoneId) =>
        milestones.value.find((milestone) => milestone.milestoneId === milestoneId)?.sequenceOrder,
    )
    .filter((sequenceOrder): sequenceOrder is number => typeof sequenceOrder === 'number')
    .sort((first, second) => first - second)

  if (!numbers.length) return ''

  const isConsecutive = numbers.every(
    (sequenceOrder, index) => index === 0 || sequenceOrder === numbers[index - 1]! + 1,
  )
  return isConsecutive && numbers.length > 1
    ? `${numbers[0]}–${numbers[numbers.length - 1]}`
    : numbers.join(', ')
}

const visibleMilestones = computed(() =>
  milestones.value.map((milestone) => {
    const prerequisiteIds = prerequisiteIdsFor(milestone)
    const incompletePrerequisiteIds = prerequisiteIds.filter(
      (milestoneId) => !completedMilestoneIds.value.has(milestoneId),
    )
    const hasPrerequisites = Boolean(milestone.prerequisiteMilestoneIds?.length)
    const incompleteMilestoneNumbers = formatMilestoneNumbers(incompletePrerequisiteIds)

    return {
      ...milestone,
      isLocked: milestone.isLocked || incompletePrerequisiteIds.length > 0,
      lockedReason: hasPrerequisites
        ? incompleteMilestoneNumbers
          ? `Complete milestone ${incompleteMilestoneNumbers} first.`
          : undefined
        : undefined,
    }
  }),
)

async function loadMilestones({ silent = false } = {}) {
  if (!silent) {
    isLoading.value = true
  }
  errorMessage.value = ''
  try {
    const [studentProfile, advisorList] = await Promise.all([getMyStudentProfile(), getAdvisors()])
    profile.value = studentProfile
    advisors.value = advisorList
    milestones.value = await getMyStudentMilestones()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load milestones'
  } finally {
    isLoading.value = false
  }
}

async function appointAdvisor(input: {
  milestoneId: string
  advisorId: string
  coAdvisorIds: string[]
}) {
  if (milestoneSubmissionLocked.value) return
  savingAppointmentMilestoneId.value = input.milestoneId
  appointmentError.value = ''
  try {
    profile.value = await appointMyStudentAdvisors(input)
    milestones.value = await getMyStudentMilestones()
    showNotification('Advisor appointment saved successfully.')
  } catch (error) {
    appointmentError.value =
      error instanceof Error ? error.message : 'Unable to save advisor appointment'
  } finally {
    savingAppointmentMilestoneId.value = null
  }
}

async function submitGraduation(input: {
  milestoneId: string
  semester: string
  academicYear: number
}) {
  if (milestoneSubmissionLocked.value) return
  savingGraduationMilestoneId.value = input.milestoneId
  graduationError.value = ''
  try {
    profile.value = await submitMyGraduation(input)
    milestones.value = await getMyStudentMilestones()
    showNotification('Graduation information saved successfully.')
  } catch (error) {
    graduationError.value =
      error instanceof Error ? error.message : 'Unable to save graduation information'
  } finally {
    savingGraduationMilestoneId.value = null
  }
}

function refreshMilestones() {
  return loadMilestones({ silent: milestones.value.length > 0 })
}

function refreshWhenVisible() {
  if (document.visibilityState === 'visible') {
    void refreshMilestones()
  }
}

function showUploadBlockedMessage(milestoneId: string, message: string) {
  if (message === advisorRequiredMessage) {
    showNotification(message)
    return
  }

  uploadErrorMilestoneId.value = milestoneId
  uploadErrorMessage.value = message
}

const advisorRequiredMessage =
  'Please complete the Appoint an Advisor milestone before uploading this evidence.'

function showNotification(message: string) {
  notificationMessage.value = message
  if (notificationTimer) window.clearTimeout(notificationTimer)
  notificationTimer = window.setTimeout(() => {
    notificationMessage.value = ''
  }, 5000)
}

async function uploadEvidence(milestoneId: string, file: File) {
  uploadingMilestoneId.value = milestoneId
  uploadErrorMilestoneId.value = milestoneId
  uploadErrorMessage.value = ''

  if (milestoneSubmissionLocked.value) {
    uploadErrorMessage.value = 'Your study period is overdue. Please contact an administrator to extend it.'
    uploadingMilestoneId.value = null
    return
  }

  if (!canUploadMilestone(milestoneId)) {
    uploadErrorMilestoneId.value = null
    uploadErrorMessage.value = ''
    showNotification(advisorRequiredMessage)
    uploadingMilestoneId.value = null
    return
  }

  if (file.size > maxMilestoneEvidenceFileSize) {
    uploadErrorMessage.value = 'Milestone evidence must not exceed 2 MB'
    uploadingMilestoneId.value = null
    return
  }

  try {
    milestones.value = await uploadMyMilestoneEvidence(milestoneId, file)
    uploadErrorMilestoneId.value = null
    showNotification('Evidence uploaded successfully.')
  } catch (error) {
    uploadErrorMessage.value =
      error instanceof Error ? error.message : 'Unable to upload milestone evidence'
  } finally {
    uploadingMilestoneId.value = null
  }
}

async function removeEvidence(milestoneId: string) {
  if (milestoneSubmissionLocked.value) return
  uploadingMilestoneId.value = milestoneId
  uploadErrorMilestoneId.value = milestoneId
  uploadErrorMessage.value = ''

  try {
    milestones.value = await removeMyMilestoneEvidence(milestoneId)
    uploadErrorMilestoneId.value = null
    showNotification('Evidence removed successfully.')
  } catch (error) {
    uploadErrorMessage.value =
      error instanceof Error ? error.message : 'Unable to remove milestone evidence'
  } finally {
    uploadingMilestoneId.value = null
  }
}

onMounted(() => {
  void loadMilestones()
  refreshTimer = window.setInterval(refreshWhenVisible, 15_000)
  window.addEventListener('focus', refreshWhenVisible)
  document.addEventListener('visibilitychange', refreshWhenVisible)
})

onBeforeUnmount(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
  if (notificationTimer) window.clearTimeout(notificationTimer)
  window.removeEventListener('focus', refreshWhenVisible)
  document.removeEventListener('visibilitychange', refreshWhenVisible)
})
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 pt-3 pb-6 font-sans text-slate-900 sm:px-6 sm:py-6 xl:px-8">
    <header>
      <h1 class="text-xl font-bold tracking-tight text-black sm:text-3xl">{{ t('studentPortal.milestoneTitle') }}</h1>
      <div class="flex items-center justify-between gap-4 sm:mt-1">
        <p class="shrink-0 text-xs text-slate-500 sm:text-sm">
          {{ t('studentPortal.milestoneDescription') }}
        </p>
        <div class="hidden w-full sm:block">
          <MilestoneStatusOverview :milestones="milestones" />
        </div>
      </div>
      <div
        class="mt-4 flex w-full flex-col gap-3 rounded-xl border border-[#ead7d5] bg-white p-3 shadow-[0_3px_10px_rgba(88,39,35,0.08)] sm:hidden"
      >
        <StudentMilestoneProgress
          embedded
          class="w-full !border-t-0 !pt-0"
          :completed-count="completedCount"
          :total-count="milestones.length"
          :percentage="progressPercentage"
        />
        <div class="w-full border-t border-slate-100 pt-2.5">
          <MilestoneStatusOverview :milestones="milestones" />
        </div>
      </div>
    </header>

    <p v-if="errorMessage" class="mt-4 text-sm text-red-600" role="alert">
      {{ errorMessage }}
    </p>

    <div v-if="isLoading" class="mt-5 rounded-lg bg-white px-5 py-4 text-sm text-slate-500">
      {{ t('studentPortal.loadingMilestones') }}
    </div>

    <template v-else>
      <StudentMilestoneProgress
        class="mt-5 hidden sm:block"
        :completed-count="completedCount"
        :total-count="milestones.length"
        :percentage="progressPercentage"
      />

      <p
        v-if="profile?.academicStatus === 'Overdue'"
        class="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
      >
        {{ t('studentPortal.overdueNotice') }}
      </p>

      <div v-if="visibleMilestones.length" class="relative mt-5 space-y-4 pb-10">
        <div
          v-if="visibleMilestones.length > 1"
          class="absolute bottom-3 left-3 top-3 w-px bg-slate-200 md:left-4"
          aria-hidden="true"
        ></div>

        <StudentMilestoneCard
          v-for="(milestone, index) in visibleMilestones"
          :key="milestone.milestoneId"
          :milestone="milestone"
          :index="index + 1"
          :is-uploading="uploadingMilestoneId === milestone.milestoneId"
          :can-upload="canUploadMilestone(milestone.milestoneId)"
          :upload-error="uploadErrorMilestoneId === milestone.milestoneId ? uploadErrorMessage : ''"
          :advisors="advisors"
          :current-advisor-id="profile?.advisorId"
          :current-co-advisor-ids="profile?.coAdvisors.map((advisor) => advisor.advisorId) ?? []"
          :is-saving-appointment="savingAppointmentMilestoneId === milestone.milestoneId"
          :appointment-error="appointmentError"
          :current-graduation-semester="profile?.graduationSemester"
          :current-graduation-academic-year="profile?.graduationAcademicYear"
          :is-saving-graduation="savingGraduationMilestoneId === milestone.milestoneId"
          :graduation-error="graduationError"
          :readonly="milestoneSubmissionLocked"
          mobile-collapsible
          mobile-description-only
          :mobile-description-line-limit="1"
          @appoint-advisor="appointAdvisor"
          @submit-graduation="submitGraduation"
          @upload-blocked="showUploadBlockedMessage"
          @upload="uploadEvidence"
          @remove-evidence="removeEvidence"
        />
      </div>

      <section
        v-else
        class="mt-5 rounded-lg border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500"
      >
        No milestones are currently assigned.
      </section>
    </template>

    <div
      v-if="notificationMessage"
      class="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-600 shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
      role="status"
      aria-live="polite"
    >
      {{ notificationMessage }}
    </div>
  </div>
</template>
