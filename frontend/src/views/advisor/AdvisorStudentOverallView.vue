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
const { isThai, t } = useLanguage()

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
  if (filters.value.advisor === 'all') return t('advisorPortal.totalStudents')
  if (filters.value.advisor === 'co-advisor') return t('advisorPortal.coAdvisedStudents')
  return t('advisorPortal.advisedStudents')
})

function viewStudentMilestones(studentId: string) {
  void router.push({ name: 'advisor-student-milestones', params: { studentId } })
}

</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 pt-3 pb-5 font-sans text-slate-900 sm:px-6 sm:py-6 xl:px-8">
    <header>
      <h1 class="text-xl font-bold tracking-tight sm:text-3xl">
        {{ t('advisorPortal.studentOverall') }}
      </h1>
      <p class="text-xs text-slate-500 sm:mt-1 sm:text-sm">
        {{ t('advisorPortal.studentOverallDescription') }}
      </p>
    </header>

    <section class="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-5 xl:grid-cols-4">
      <SummaryCard :title="totalStudentsTitle" :value="statistics.total" icon="students" />
      <SummaryCard :title="t('advisorPortal.onTrack')" :value="statistics.onTrack" icon="on-track" />
      <SummaryCard :title="t('advisorPortal.overdue')" :value="statistics.overdue" icon="overdue" />
      <SummaryCard :title="t('advisorPortal.graduate')" :value="statistics.graduate" icon="graduate" />
    </section>

    <StudentOverview
      class="min-h-[430px] sm:min-h-0"
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
