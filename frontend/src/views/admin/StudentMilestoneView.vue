<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { students } from '@/data/admin/students'

const route = useRoute()
const student = computed(() => students.find((item) => item.id === route.params.studentId))

const milestones = [
  { title: 'Proposal Submission', status: 'Completed', date: '15 January 2026' },
  { title: 'Proposal Defense', status: 'Completed', date: '20 February 2026' },
  { title: 'Progress Report', status: 'In Progress', date: '30 June 2026' },
  { title: 'Final Defense', status: 'Not Started', date: 'Not scheduled' },
]
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-8 py-6 text-slate-900">
    <RouterLink
      to="/"
      class="inline-flex items-center gap-2 text-sm font-medium text-[#7D2923] hover:underline"
    >
      <span aria-hidden="true">←</span>
      Back to Student Dashboard
    </RouterLink>

    <template v-if="student">
      <header class="mt-5">
        <h1 class="text-3xl font-bold tracking-tight">Student Milestones</h1>
        <p class="mt-1 text-sm text-slate-500">Review thesis progress and milestone status</p>
      </header>

      <section class="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold">{{ student.name }}</h2>
            <p class="mt-1 text-sm text-slate-500">
              {{ student.studentId }} · {{ student.program }} {{ student.department }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs text-slate-400">Advisor</p>
            <p class="text-sm font-medium">{{ student.advisor }}</p>
          </div>
        </div>
      </section>

      <section class="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold">Milestone Progress</h2>

        <div class="mt-6 space-y-4">
          <article
            v-for="milestone in milestones"
            :key="milestone.title"
            class="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-4"
          >
            <div>
              <h3 class="font-medium">{{ milestone.title }}</h3>
              <p class="mt-1 text-xs text-slate-400">{{ milestone.date }}</p>
            </div>
            <span
              class="rounded-full px-3 py-1 text-xs font-medium"
              :class="{
                'bg-emerald-100 text-emerald-700': milestone.status === 'Completed',
                'bg-amber-100 text-amber-700': milestone.status === 'In Progress',
                'bg-slate-100 text-slate-500': milestone.status === 'Not Started',
              }"
            >
              {{ milestone.status }}
            </span>
          </article>
        </div>
      </section>
    </template>

    <div v-else class="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h1 class="text-xl font-semibold">Student not found</h1>
      <p class="mt-2 text-sm text-slate-500">
        The requested student does not exist in the mock data.
      </p>
    </div>
  </div>
</template>
