<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import StudentMilestoneCard from '@/components/student-milestone/StudentMilestoneCard.vue'
import StudentMilestoneProgress from '@/components/student-milestone/StudentMilestoneProgress.vue'
import { getStudentMilestones } from '@/services/students.api'
import type { StudentMilestone } from '@/types/milestone'

const route = useRoute()

const studentId = computed(() => String(route.params.studentId ?? ''))
const studentName = ref('')
const milestones = ref<StudentMilestone[]>([])
const isLoading = ref(false)
const errorMessage = ref('')

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
    const result = await getStudentMilestones(studentId.value)
    studentName.value = result.student.studentName
    milestones.value = result.milestones
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load student milestones'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadMilestones)
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-6 xl:px-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-black">Milestone</h1>
        <p class="mt-1 text-sm text-slate-500">
          You have permission to view students' milestones only.
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
