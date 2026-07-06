<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import StudentMilestoneCard from '@/components/student-milestone/StudentMilestoneCard.vue'
import StudentMilestoneProgress from '@/components/student-milestone/StudentMilestoneProgress.vue'
import {
  getMyStudentMilestones,
  removeMyMilestoneEvidence,
  uploadMyMilestoneEvidence,
} from '@/services/student-milestones.api'
import { getMyStudentProfile, type StudentProfile } from '@/services/student-profile.api'
import type { StudentMilestone } from '@/types/milestone'

const milestones = ref<StudentMilestone[]>([])
const profile = ref<StudentProfile | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
const uploadingMilestoneId = ref<string | null>(null)
const uploadErrorMilestoneId = ref<string | null>(null)
const uploadErrorMessage = ref('')
const maxMilestoneEvidenceFileSize = 2 * 1024 * 1024
let refreshTimer: ReturnType<typeof window.setInterval> | undefined

const completedCount = computed(
  () => milestones.value.filter((milestone) => ['Approved', 'Completed'].includes(milestone.status)).length,
)

const progressPercentage = computed(() => {
  if (!milestones.value.length) return 0
  return Math.round((completedCount.value / milestones.value.length) * 100)
})
const hasAdvisor = computed(() => Boolean(profile.value?.advisorId))

async function loadMilestones({ silent = false } = {}) {
  if (!silent) {
    isLoading.value = true
  }
  errorMessage.value = ''
  try {
    const [studentMilestones, studentProfile] = await Promise.all([
      getMyStudentMilestones(),
      getMyStudentProfile(),
    ])
    milestones.value = studentMilestones
    profile.value = studentProfile
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load milestones'
  } finally {
    isLoading.value = false
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

async function uploadEvidence(milestoneId: string, file: File) {
  uploadErrorMilestoneId.value = milestoneId
  uploadErrorMessage.value = ''

  if (!hasAdvisor.value) {
    uploadErrorMessage.value = 'Please select an advisor before uploading milestone evidence'
    return
  }

  if (file.size > maxMilestoneEvidenceFileSize) {
    uploadErrorMessage.value = 'Milestone evidence must not exceed 2 MB'
    return
  }

  uploadingMilestoneId.value = milestoneId
  errorMessage.value = ''
  try {
    milestones.value = await uploadMyMilestoneEvidence(milestoneId, file)
    uploadErrorMilestoneId.value = null
    uploadErrorMessage.value = ''
  } catch (error) {
    uploadErrorMessage.value = error instanceof Error ? error.message : 'Unable to upload evidence'
  } finally {
    uploadingMilestoneId.value = null
  }
}

async function removeEvidence(milestoneId: string) {
  uploadingMilestoneId.value = milestoneId
  errorMessage.value = ''
  try {
    milestones.value = await removeMyMilestoneEvidence(milestoneId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to remove evidence'
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
  window.removeEventListener('focus', refreshWhenVisible)
  document.removeEventListener('visibilitychange', refreshWhenVisible)
})
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-6 xl:px-8">
    <header>
      <h1 class="text-3xl font-bold tracking-tight text-black">Milestone</h1>
      <p class="mt-1 text-sm text-slate-500">
        Track your academic progress and deadline
      </p>
    </header>

    <p v-if="errorMessage" class="mt-4 text-sm text-red-600" role="alert">
      {{ errorMessage }}
    </p>

    <p
      v-if="!isLoading && profile && !hasAdvisor"
      class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
      role="status"
    >
      Please select an advisor in Student Information before uploading milestone evidence.
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
          :is-uploading="uploadingMilestoneId === milestone.milestoneId"
          :can-upload="hasAdvisor"
          :upload-error="
            uploadErrorMilestoneId === milestone.milestoneId ? uploadErrorMessage : ''
          "
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
  </div>
</template>
