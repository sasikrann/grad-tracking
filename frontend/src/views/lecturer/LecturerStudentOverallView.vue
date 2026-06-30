<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import StudentOverview from '@/components/student/StudentOverview.vue'
import SummaryCard from '@/components/student/SummaryCard.vue'
import { useStudentOverview } from '@/composables/useStudentOverview'
import { currentUser } from '@/services/auth'
import { getAdvisorStudentOverview, getAdvisorStudents } from '@/services/students.api'
import type { Student } from '@/types/student'

const router = useRouter()

async function loadAdvisorStudentOverview() {
  const advisorId = currentUser.value?.advisorId

  if (!advisorId) {
    throw new Error('Advisor profile is not linked to this account')
  }

  const advisorStudents = await getAdvisorStudents(advisorId)
  const allStudents = await getAdvisorStudentOverview(advisorId).catch(() => [])

  if (!allStudents.length) return advisorStudents

  const studentsById = new Map<string, Student>()
  allStudents.forEach((student) => studentsById.set(student.studentId, student))
  advisorStudents.forEach((student) => studentsById.set(student.studentId, student))

  return Array.from(studentsById.values())
}

const { filteredStudents, filters, isLoading, loadError, search, statistics, yearOptions } = useStudentOverview(
  loadAdvisorStudentOverview,
  'default',
)

const totalStudentsTitle = computed(() =>
  filters.value.advisor === 'all' ? 'Total Students' : 'Advised Students',
)

function viewStudentMilestones(studentId: string) {
  void router.push({ name: 'advisor-student-milestones', params: { studentId } })
}
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-6 xl:px-8">
    <header>
      <h1 class="text-3xl font-bold tracking-tight">Student Overall</h1>
      <p class="mt-1 text-sm text-slate-500">
        Monitor advised students, track their progress, and review thesis status
      </p>
    </header>

    <section class="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
      <SummaryCard :title="totalStudentsTitle" :value="statistics.total" icon="students" />
      <SummaryCard title="On-track" :value="statistics.onTrack" icon="on-track" />
      <SummaryCard title="Overdue" :value="statistics.overdue" icon="overdue" />
    </section>
    <StudentOverview
      v-model:filters="filters"
      v-model:search="search"
      :students="filteredStudents"
      :is-loading="isLoading"
      :error="loadError"
      :year-options="yearOptions"
      @view="viewStudentMilestones"
    />
  </div>
</template>
