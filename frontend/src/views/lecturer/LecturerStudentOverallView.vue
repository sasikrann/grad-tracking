<script setup lang="ts">
import StudentOverview from '@/components/student/StudentOverview.vue'
import SummaryCard from '@/components/student/SummaryCard.vue'
import { useStudentOverview } from '@/composables/useStudentOverview'
import { getAdvisorStudents } from '@/services/students.api'

const advisorId = 'ADV001'

const { filteredStudents, filters, isLoading, loadError, search, statistics } = useStudentOverview(
  () => getAdvisorStudents(advisorId),
  'default',
)
</script>

<template>
  <div class="lecturer-student-overall-page">
    <section class="grid grid-cols-1 gap-5 md:grid-cols-3">
      <SummaryCard title="Advised Students" :value="statistics.total" icon="students" />
      <SummaryCard title="On-track" :value="statistics.onTrack" icon="on-track" />
      <SummaryCard title="Overdue" :value="statistics.overdue" icon="overdue" />
    </section>

    <StudentOverview
      v-model:filters="filters"
      v-model:search="search"
      :students="filteredStudents"
      :is-loading="isLoading"
      :error="loadError"
    />
  </div>
</template>

<style scoped>
.lecturer-student-overall-page {
  width: 100%;
  min-width: 0;
  min-height: 100vh;
  padding: 2rem 1.5rem;
  color: #111111;
  background-color: #f8f8f8;
}

@media (min-width: 1280px) {
  .lecturer-student-overall-page {
    padding-right: 2.5rem;
    padding-left: 2.5rem;
  }
}
</style>
