<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import StudentMilestoneCard from '@/components/student-milestone/StudentMilestoneCard.vue'
import StudentMilestoneProgress from '@/components/student-milestone/StudentMilestoneProgress.vue'
import {
  getStandardMilestonesForStudent,
  toFrontendStudentMilestones,
} from '@/data/standard-milestones'
import { currentUser } from '@/services/auth'
import { getAdvisorStudentOverview } from '@/services/students.api'
import type { StudentMilestone } from '@/types/milestone'

const route = useRoute()

const studentId = computed(() => String(route.params.studentId ?? ''))
const studentName = ref('')
const milestones = ref<StudentMilestone[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const reviewingMilestoneId = ref<string | null>(null)
const rejectMilestone = ref<StudentMilestone | null>(null)
const rejectComment = ref('')

const completedCount = computed(
  () => milestones.value.filter((milestone) => ['Approved', 'Completed'].includes(milestone.status)).length,
)

const progressPercentage = computed(() => {
  if (!milestones.value.length) return 0
  return Math.round((completedCount.value / milestones.value.length) * 100)
})

async function loadMilestones() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const advisorId = currentUser.value?.advisorId
    if (!advisorId) throw new Error('Advisor profile is not linked to this account')
    const students = await getAdvisorStudentOverview(advisorId)
    const student = students.find((candidate) => candidate.studentId === studentId.value)
    if (!student) throw new Error('Student not found')
    studentName.value = student.name
    const degreeLevel = student.degree === 'Ph. D.' ? 'Doctoral' : 'Master'
    milestones.value = toFrontendStudentMilestones(
      getStandardMilestonesForStudent(degreeLevel, student.educationPlan),
    )
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load student milestones'
  } finally {
    isLoading.value = false
  }
}

function canReview(milestone: StudentMilestone) {
  return milestone.status === 'Completed' && Boolean(milestone.evidenceUrl)
}

async function approveMilestone(milestone: StudentMilestone) {
  void milestone
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

  closeRejectDialog()
}

onMounted(loadMilestones)
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-6 xl:px-8">
    <div class="w-full">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-black">Milestone</h1>
          <p class="mt-1 text-sm text-slate-500">
            You have permission to approve, reject, and view students' progress.
          </p>
        </div>

        <div
          v-if="studentName"
          class="inline-flex flex-wrap items-center gap-2 rounded-lg border border-[#ead7d5] bg-white px-3 py-2 text-sm shadow-sm"
        >
          <span class="font-medium text-[#3b2f2e]">{{ studentName }}</span>
          <span class="rounded-md bg-[#f5e6e5] px-2 py-0.5 text-xs font-medium text-[#8a2b25]">
            {{ studentId }}
          </span>
        </div>
      </header>

      <p v-if="errorMessage" class="mt-4 text-sm text-red-600" role="alert">
        {{ errorMessage }}
      </p>

      <div v-if="isLoading" class="mt-5 rounded-lg bg-white px-5 py-4 text-sm text-slate-500">
        Loading milestones...
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
          No milestones are currently assigned.
        </section>
      </template>
    </div>

    <div v-if="rejectMilestone" class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
      <form
        class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        @submit.prevent="submitReject"
      >
        <h2 class="text-lg font-bold text-black">Reject Submission</h2>
        <p class="mt-1 text-xs text-slate-500">
          {{ rejectMilestone.title }} - Provide feedback for the student
        </p>

        <label class="mt-4 block text-sm font-semibold text-black" for="reject-comment">
          Reason for rejection
        </label>
        <textarea
          id="reject-comment"
          v-model="rejectComment"
          class="mt-1 min-h-20 w-full resize-none rounded border border-[#c06f68] px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#8a2b25]/25"
          placeholder="Please provide detailed feedback on why this submission is being rejected..."
          required
        ></textarea>

        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="h-8 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-black shadow-sm hover:bg-slate-50"
            @click="closeRejectDialog"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="h-8 rounded bg-[#8a2b25] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#75201b] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!rejectComment.trim() || reviewingMilestoneId === rejectMilestone.milestoneId"
          >
            Reject Submission
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
