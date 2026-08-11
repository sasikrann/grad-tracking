<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import StudentOverview from '@/components/student/StudentOverview.vue'
import SummaryCard from '@/components/student/SummaryCard.vue'
import { useStudentOverview } from '@/composables/useStudentOverview'
import { useLanguage } from '@/composables/useLanguage'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { currentUser } from '@/services/auth'
import { getAdvisorStudentOverview } from '@/services/students.api'

defineOptions({ name: 'AdvisorStudentOverallView' })

const router = useRouter()
const { isThai } = useLanguage()

async function loadAdvisorStudentOverview() {
  const advisorId = currentUser.value?.advisorId

  if (!advisorId) {
    throw new Error('Advisor profile is not linked to this account')
  }

  return getAdvisorStudentOverview(advisorId)
}

const {
  filteredStudents,
  filters,
  isLoading,
  loadError,
  loadStudents,
  search,
  statistics,
  students,
  yearOptions,
} = useStudentOverview(loadAdvisorStudentOverview, 'default')

useAutoRefresh(() => loadStudents({ silent: true }))

const totalStudentsTitle = computed(() => {
  if (filters.value.advisor === 'all') return 'Total Students'
  if (filters.value.advisor === 'co-advisor') return 'Co-advised Students'
  return 'Advised Students'
})

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

    <section class="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard :title="totalStudentsTitle" :value="statistics.total" icon="students" />
      <SummaryCard title="On-track" :value="statistics.onTrack" icon="on-track" />
      <SummaryCard title="Overdue" :value="statistics.overdue" icon="overdue" />
      <SummaryCard title="Graduate" :value="statistics.graduate" icon="graduate" />
    </section>

    <StudentOverview
      v-model:filters="filters"
      v-model:search="search"
      :students="filteredStudents"
      :is-loading="isLoading"
      :error="loadError"
      :year-options="yearOptions"
      :available-students="students"
      :buddhist-year="isThai"
      @view="viewStudentMilestones"
    />
  </div>
</template>
