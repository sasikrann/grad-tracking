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
  <div class="min-h-screen bg-[#f7f7f7] px-8 py-6 font-sans text-slate-900">
      <header class="mb-6">
        <h1 class="text-3xl font-bold tracking-tight">Student Overall</h1>
        <p class="mt-1 text-sm text-slate-500">
          Monitor advised students, track their progress, and review thesis status
        </p>
      </header>
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
