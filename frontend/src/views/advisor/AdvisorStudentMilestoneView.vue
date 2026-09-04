<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import MilestoneStatusOverview from '@/components/student-milestone/MilestoneStatusOverview.vue'
import StudentMilestoneCard from '@/components/student-milestone/StudentMilestoneCard.vue'
import StudentMilestoneProgress from '@/components/student-milestone/StudentMilestoneProgress.vue'
import {
  getAdvisorStudentMilestones,
  reviewAdvisorMilestone,
} from '@/services/advisor-milestones.api'
import type { StudentMilestone } from '@/types/milestone'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { useLanguage } from '@/composables/useLanguage'

defineOptions({ name: 'AdvisorStudentMilestoneView' })

const route = useRoute()
const { t } = useLanguage()

const studentId = computed(() => String(route.params.studentId ?? ''))
const studentName = ref('')
const graduationSemester = ref<string | null>(null)
const graduationAcademicYear = ref<number | null>(null)
const milestones = ref<StudentMilestone[]>([])
const advisorCanReview = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const reviewingMilestoneId = ref<string | null>(null)
const rejectMilestone = ref<StudentMilestone | null>(null)
const rejectComment = ref('')

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
    const result = await getAdvisorStudentMilestones(studentId.value)
    studentName.value = result.student.studentName
    graduationSemester.value = result.student.graduationSemester
    graduationAcademicYear.value = result.student.graduationAcademicYear
    milestones.value = result.milestones
    advisorCanReview.value = result.canReview
  } catch (error) {
    advisorCanReview.value = false
    errorMessage.value =
      error instanceof Error ? error.message : 'Unable to load student milestones'
  } finally {
    if (!silent) isLoading.value = false
  }
}

function canReview(milestone: StudentMilestone) {
  return (
    advisorCanReview.value && milestone.status === 'Completed' && Boolean(milestone.evidenceUrl)
  )
}

async function approveMilestone(milestone: StudentMilestone) {
  reviewingMilestoneId.value = milestone.milestoneId
  errorMessage.value = ''

  try {
    await reviewAdvisorMilestone(studentId.value, milestone.milestoneId, 'approve')
    await loadMilestones()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to approve milestone'
  } finally {
    reviewingMilestoneId.value = null
  }
}

function openRejectDialog(milestone: StudentMilestone) {
  rejectMilestone.value = milestone
  rejectComment.value = ''
}

function closeRejectDialog() {
  rejectMilestone.value = null
  rejectComment.value = ''
}

async function submitReject() {
  if (!rejectMilestone.value || !rejectComment.value.trim()) return

  const milestone = rejectMilestone.value
  reviewingMilestoneId.value = milestone.milestoneId
  errorMessage.value = ''

  try {
    await reviewAdvisorMilestone(
      studentId.value,
      milestone.milestoneId,
      'reject',
      rejectComment.value.trim(),
    )
    closeRejectDialog()
    await loadMilestones()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to reject milestone'
  } finally {
    reviewingMilestoneId.value = null
  }
}

onMounted(loadMilestones)
useAutoRefresh(() => loadMilestones({ silent: true }), {
  canRefresh: () => !rejectMilestone.value && !reviewingMilestoneId.value,
})
</script>

<template>
  <div
    class="min-h-screen bg-[#f7f7f7] px-3 pt-3 pb-6 font-sans text-slate-900 sm:px-6 sm:py-6 xl:px-8"
  >
    <div class="w-full">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-black sm:text-3xl">
            {{ t('advisorPortal.milestone') }}
          </h1>
          <p class="text-xs text-slate-500 sm:mt-1 sm:text-sm">
            {{ advisorCanReview ? t('advisorPortal.canReview') : t('advisorPortal.viewOnly') }}
          </p>
        </div>

        <div class="hidden flex-col items-end gap-2 sm:flex">
          <div
            v-if="studentName"
            class="inline-flex flex-wrap items-center gap-2 rounded-lg border border-[#ead7d5] bg-white px-3 py-2 text-sm shadow-sm"
          >
            <span class="font-medium text-[#3b2f2e]">{{ studentName }}</span>
            <span class="rounded-md bg-[#f5e6e5] px-2 py-0.5 text-xs font-medium text-[#8a2b25]">
              {{ studentId }}
            </span>
          </div>
          <MilestoneStatusOverview :milestones="milestones" />
        </div>

        <div
          class="flex w-full flex-col gap-3 rounded-xl border border-[#ead7d5] bg-white p-3 shadow-[0_3px_10px_rgba(88,39,35,0.08)] sm:hidden"
        >
          <div v-if="studentName" class="flex w-full items-center gap-2.5">
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f7e7e5] text-[#8a2b25]"
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
              <span class="block truncate text-sm font-semibold text-[#3b2f2e]">
                {{ studentName }}
              </span>
              <span class="mt-0.5 block text-[11px] font-medium text-[#9a4a44]">
                {{ studentId }}
              </span>
            </span>
          </div>
          <StudentMilestoneProgress
            embedded
            class="w-full"
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
        {{ t('advisorPortal.loadingMilestones') }}
      </div>

      <template v-else>
        <StudentMilestoneProgress
          class="mt-5 hidden sm:block"
          :completed-count="completedCount"
          :total-count="milestones.length"
          :percentage="progressPercentage"
        />

        <div v-if="milestones.length" class="relative mt-5 space-y-4 pb-10">
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
            :current-graduation-semester="graduationSemester"
            :current-graduation-academic-year="graduationAcademicYear"
            readonly
            mobile-collapsible
            mobile-description-only
            :mobile-description-line-limit="1"
            :can-review="canReview(milestone)"
            :is-reviewing="reviewingMilestoneId === milestone.milestoneId"
            @approve="approveMilestone"
            @reject="openRejectDialog"
          />
        </div>

        <section
          v-else
          class="mt-5 rounded-lg border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500"
        >
          {{ t('advisorPortal.noMilestones') }}
        </section>
      </template>
    </div>

    <div
      v-if="rejectMilestone"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
    >
      <form
        class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        @submit.prevent="submitReject"
      >
        <h2 class="text-lg font-bold text-black">{{ t('advisorPortal.rejectSubmission') }}</h2>
        <p class="mt-1 text-xs text-slate-500">
          {{ rejectMilestone.title }} - {{ t('advisorPortal.rejectDescription') }}
        </p>

        <label class="mt-4 block text-sm font-semibold text-black" for="reject-comment">
          {{ t('advisorPortal.rejectionReason') }}
        </label>
        <textarea
          id="reject-comment"
          v-model="rejectComment"
          class="mt-1 min-h-20 w-full resize-none rounded border border-[#c06f68] px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#8a2b25]/25"
          :placeholder="t('advisorPortal.rejectionPlaceholder')"
          required
        ></textarea>

        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="h-8 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-black shadow-sm hover:bg-slate-50"
            @click="closeRejectDialog"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="submit"
            class="h-8 rounded bg-[#8a2b25] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#75201b] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="
              !rejectComment.trim() || reviewingMilestoneId === rejectMilestone.milestoneId
            "
          >
            {{ t('advisorPortal.rejectSubmission') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
