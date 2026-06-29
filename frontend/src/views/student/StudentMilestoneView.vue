<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import StudentMilestoneCard from '@/components/student-milestone/StudentMilestoneCard.vue'
import StudentMilestoneProgress from '@/components/student-milestone/StudentMilestoneProgress.vue'
import {
  getMyStudentMilestones,
  removeMyMilestoneEvidence,
  uploadMyMilestoneEvidence,
} from '@/services/student-milestones.api'
import type { StudentMilestone } from '@/types/milestone'

const milestones = ref<StudentMilestone[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const uploadingMilestoneId = ref<string | null>(null)
let refreshTimer: ReturnType<typeof window.setInterval> | undefined

const completedCount = computed(
  () => milestones.value.filter((milestone) => ['Approved', 'Completed'].includes(milestone.status)).length,
)

const progressPercentage = computed(() => {
  if (!milestones.value.length) return 0
  return Math.round((completedCount.value / milestones.value.length) * 100)
})

async function loadMilestones({ silent = false } = {}) {
  if (!silent) {
    isLoading.value = true
  }
  errorMessage.value = ''
  try {
    milestones.value = await getMyStudentMilestones()
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
  uploadingMilestoneId.value = milestoneId
  errorMessage.value = ''
  try {
    milestones.value = await uploadMyMilestoneEvidence(milestoneId, file)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to upload evidence'
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
      <p class="mt-1 text-sm font-semibold text-neutral-500">
        Track your academic progress and deadline
      </p>
    </header>

    <p v-if="errorMessage" class="mt-4 text-sm text-red-600" role="alert">
      {{ errorMessage }}
    </p>

    <div v-if="isLoading" class="mt-5 rounded-lg bg-white px-5 py-4 text-sm text-neutral-500">
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
        class="relative mt-5 space-y-8 pb-10"
      >
        <div
          v-if="milestones.length > 1"
          class="absolute bottom-3 left-4 top-3 w-px bg-neutral-400 md:left-5"
          aria-hidden="true"
        ></div>

        <StudentMilestoneCard
          v-for="(milestone, index) in milestones"
          :key="milestone.milestoneId"
          :milestone="milestone"
          :index="index + 1"
          :is-uploading="uploadingMilestoneId === milestone.milestoneId"
          @upload="uploadEvidence"
          @remove-evidence="removeEvidence"
        />
      </div>

      <section
        v-else
        class="mt-5 rounded-lg border border-slate-200 bg-white px-5 py-10 text-center text-sm text-neutral-500"
      >
        No milestones are currently assigned.
      </section>
    </template>
  </div>
</template>
