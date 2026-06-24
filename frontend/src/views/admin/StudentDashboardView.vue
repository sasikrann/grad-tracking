<script setup lang="ts">
import { ref } from 'vue'

import StudentOverview from '@/components/student/StudentOverview.vue'
import SummaryCard from '@/components/student/SummaryCard.vue'
import { useStudentOverview } from '@/composables/useStudentOverview'
import {
  downloadStudentTemplate,
  exportStudents,
  getStudents,
  importStudents,
} from '@/services/students.api'

const { filteredStudents, filters, isLoading, loadError, loadStudents, search, statistics } =
  useStudentOverview(getStudents, 'all')

const fileInput = ref<HTMLInputElement | null>(null)
const operationMessage = ref('')
const isImporting = ref(false)
const isExporting = ref(false)

async function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  operationMessage.value = ''
  isImporting.value = true
  try {
    const result = await importStudents(file)
    operationMessage.value = `Imported ${result.successRecords}/${result.totalRecords} students`
    await loadStudents()
  } catch (error) {
    operationMessage.value = error instanceof Error ? error.message : 'Unable to import students'
  } finally {
    isImporting.value = false
    input.value = ''
  }
}

async function handleExport() {
  operationMessage.value = ''
  isExporting.value = true
  try {
    await exportStudents()
  } catch (error) {
    operationMessage.value = error instanceof Error ? error.message : 'Unable to export students'
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-8 py-6 font-sans text-slate-900">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p class="mt-1 text-sm text-slate-500">
          Manage student data, track progress, and monitor thesis status
        </p>
      </div>

      <button
        type="button"
        class="rounded-lg bg-[#8b2a23] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#7a211c]"
        @click="downloadStudentTemplate"
      >
        Download Template
      </button>
    </header>

    <section class="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2" aria-label="Import and export">
      <button
        type="button"
        :disabled="isImporting"
        class="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-7 text-center shadow-sm transition hover:border-[#7d2923] disabled:cursor-wait disabled:opacity-60"
        @click="fileInput?.click()"
      >
        <span class="flex size-12 items-center justify-center rounded-full bg-[#f8e9e9] text-[#a33a3a]">
          <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M12 3v12M7 10l5 5 5-5" />
            <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
          </svg>
        </span>
        <span class="mt-3 font-semibold">{{ isImporting ? 'Importing...' : 'Import Excel' }}</span>
        <span class="mt-1 text-xs text-slate-500">Upload student records from CSV or Excel.</span>
      </button>

      <input ref="fileInput" class="hidden" type="file" accept=".csv,.xlsx" @change="handleImport" />

      <button
        type="button"
        :disabled="isExporting"
        class="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-7 text-center shadow-sm transition hover:border-emerald-500 disabled:cursor-wait disabled:opacity-60"
        @click="handleExport"
      >
        <span class="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M12 15V3M7 8l5-5 5 5" />
            <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
          </svg>
        </span>
        <span class="mt-3 font-semibold">{{ isExporting ? 'Exporting...' : 'Export Excel' }}</span>
        <span class="mt-1 text-xs text-slate-500">Download all student information.</span>
      </button>
    </section>

    <p v-if="operationMessage" class="mt-3 text-sm text-slate-600" role="status">
      {{ operationMessage }}
    </p>

    <section class="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
      <SummaryCard title="Total Students" :value="statistics.total" icon="students" />
      <SummaryCard title="On-track" :value="statistics.onTrack" icon="on-track" />
      <SummaryCard title="Overdue" :value="statistics.overdue" icon="overdue" />
    </section>

    <StudentOverview
      v-model:filters="filters"
      v-model:search="search"
      :students="filteredStudents"
      :is-loading="isLoading"
      :error="loadError"
      advisor-mode="all-only"
    />
  </div>
</template>
